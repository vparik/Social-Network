package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/models"
	"strings"

	"github.com/Des1red/goauthlib/goauth"
)

func SearchUsers(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	if payload == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("q"))
	if query == "" {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]*models.User{})
		return
	}

	users, err := store.SearchUsers(query, payload.UserID)
	if err != nil {
		http.Error(w, "failed to search users", http.StatusInternalServerError)
		return
	}

	if users == nil {
		users = []*models.User{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}
