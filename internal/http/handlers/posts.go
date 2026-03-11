package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

func CreatePost(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())

	//Check method

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := payload.UserID

	//Decode request body from form submission
	var body struct {
		Title   string `json:"title"`
		Content string `json:"content"`
		Privacy string `json:"privacy"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validation
	if body.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}
	if body.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}
	if body.Privacy == "" {
		body.Privacy = "public"
	}
	if body.Privacy != "public" && body.Privacy != "friends" {
		http.Error(w, "privacy must be 'public' or 'friends'", http.StatusBadRequest)
		return
	}

	store.CreatePost(userID, body.Title, body.Content, body.Privacy)

	//Return the created post as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"user_id": userID,
		"title":   body.Title,
		"content": body.Content,
		"privacy": body.Privacy,
	})
}

func DeletePost(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	w.Write([]byte("delete post by user " + strconv.Itoa(payload.UserID)))
}
