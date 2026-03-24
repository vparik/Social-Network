// Package chat contains HTTP handlers for chat-related endpoints.
//
// GetChatUsers returns the list of available chat users for the authenticated
// user. For now this includes all users except the current user.
//
// The response is shaped for the chat sidebar and includes:
//   - user id
//   - display name
//   - current online status based on the in-memory chat hub
//
// Later this endpoint can be restricted to followers / allowed contacts only.
package chat

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"socialnet/internal/database/store"
	"socialnet/internal/http/chat"

	"github.com/Des1red/goauthlib/goauth"
)

func GetChatUsers(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	if payload == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	users, err := store.GetAllUsersExcept(payload.UserID)
	if err != nil {
		log.Println("GetAllUsersExcept error:", err)
		http.Error(w, "failed to load users", http.StatusInternalServerError)
		return
	}

	type chatUser struct {
		ID          int    `json:"id"`
		Name        string `json:"name"`
		Online      bool   `json:"online"`
		UnreadCount int    `json:"unreadCount"`
	}

	out := make([]chatUser, 0, len(users))

	for _, u := range users {
		name := strings.TrimSpace(u.FirstName + " " + u.LastName)
		if name == "" {
			name = u.Nickname
		}
		if name == "" {
			name = "User"
		}

		_, online := chat.Manager.Get(u.ID)

		unreadCount, err := store.CountUnreadFromUser(payload.UserID, u.ID)
		if err != nil {
			log.Println("CountUnreadFromUser error:", err)
			http.Error(w, "failed to load unread counts", http.StatusInternalServerError)
			return
		}

		out = append(out, chatUser{
			ID:          u.ID,
			Name:        name,
			Online:      online,
			UnreadCount: unreadCount,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}
