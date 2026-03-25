// Package chat contains HTTP handlers for loading persisted chat state.
//
// GetConversation returns the full private conversation between the
// authenticated user and the selected other user.
//
// In addition to loading message history, this handler also:
//   - marks unread incoming messages in that conversation as read
//   - notifies the original sender if they are online
//
// This endpoint is used when opening a chat so the UI can load persisted
// history while websocket remains responsible for live message delivery.
package chat

import (
	"encoding/json"
	"net/http"
	"strconv"

	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"

	"github.com/Des1red/goauthlib/goauth"
)

func GetConversation(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	if payload == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	otherIDStr := r.URL.Query().Get("userId")
	if otherIDStr == "" {
		http.Error(w, "missing userId", http.StatusBadRequest)
		return
	}

	otherUserID, err := strconv.Atoi(otherIDStr)
	if err != nil || otherUserID <= 0 {
		http.Error(w, "invalid userId", http.StatusBadRequest)
		return
	}

	allowed, err := store.AreMutualFollows(payload.UserID, otherUserID)
	if err != nil {
		http.Error(w, "failed to verify chat access", http.StatusInternalServerError)
		return
	}
	if !allowed {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// find unread incoming messages first
	unreadIDs, err := store.GetUnreadMessageIDs(otherUserID, payload.UserID)
	if err != nil {
		http.Error(w, "failed to inspect unread messages", http.StatusInternalServerError)
		return
	}

	// mark incoming unread messages as read
	readAt, err := store.MarkConversationRead(payload.UserID, otherUserID)
	if err != nil {
		http.Error(w, "failed to update read status", http.StatusInternalServerError)
		return
	}

	// notify original sender if they are online
	if len(unreadIDs) > 0 {
		ws.NotifyConversationRead(otherUserID, payload.UserID, unreadIDs, readAt)
	}

	messages, err := store.GetConversation(payload.UserID, otherUserID)
	if err != nil {
		http.Error(w, "failed to load conversation", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}
