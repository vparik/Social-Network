package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"

	"github.com/Des1red/goauthlib/goauth"
)

func GetNotifications(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	items, unreadCount, err := store.GetNotifications(payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(map[string]any{
		"notifications": items,
		"unreadCount":   unreadCount,
	})
}

func MarkAllNotificationsRead(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())

	if err := store.MarkAllNotificationsRead(payload.UserID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	ws.NotifyNotificationsRead(payload.UserID)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}
