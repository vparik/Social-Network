package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/models"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

// CreateComment handles POST /api/posts/{id}/comments.
// Expects a JSON body: { "content": "" }
func CreateComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	postIDRaw := r.PathValue("id")
	postID, err := strconv.Atoi(postIDRaw)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	var body struct {
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	if body.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	comment, err := store.CreateComment(postID, userID, body.Content)
	if err != nil {
		http.Error(w, "failed to create comment", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// GetComments handles GET /api/posts/{id}/comments.
// Returns all comments for a post, oldest first.
func GetComments(w http.ResponseWriter, r *http.Request) {
	postIDRaw := r.PathValue("id")
	postID, err := strconv.Atoi(postIDRaw)
	if err != nil {
		http.Error(w, "invalid post id", http.StatusBadRequest)
		return
	}

	comments, err := store.GetComments(postID)
	if err != nil {
		http.Error(w, "failed to fetch comments", http.StatusInternalServerError)
		return
	}

	if comments == nil {
		comments = []*models.Comment{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(comments)
}
