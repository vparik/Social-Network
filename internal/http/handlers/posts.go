package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"
	"socialnet/internal/models"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

// CreatePost handles POST /api/posts.
// Expects a JSON body: { "title": "", "content": "", "privacy": "" }
// privacy must be: "public" | "selected" (followers only) | "private" (chosen followers)
func CreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	var body struct {
		Title   string `json:"title"`
		Content string `json:"content"`
		Privacy string `json:"privacy"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if body.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}
	if body.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}

	post, err := store.CreatePost(userID, body.Title, body.Content, body.Privacy)
	if err != nil {
		http.Error(w, "failed to create post", http.StatusInternalServerError)
		return
	}

	ws.NotifyPostCreated(post)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GetPosts handles GET /api/posts.
// Returns all public posts ordered by newest first, to feed the home page.
func GetPosts(w http.ResponseWriter, r *http.Request) {
	// -- Fetch posts from DB --
	posts, err := store.GetPosts()
	if err != nil {
		http.Error(w, "failed to fetch posts", http.StatusInternalServerError)
		return
	}

	// Return an empty array instead of null when there are no posts
	if posts == nil {
		posts = []*models.Post{}
	}

	// -- Return posts as JSON --
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// DeletePost handles DELETE /api/posts/{id}.
// TODO: implement ownership check before deleting
func DeletePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
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

	err = store.DeletePost(postID, userID)
	if err != nil {
		switch err.Error() {
		case "post_not_found":
			http.Error(w, "post not found", http.StatusNotFound)
			return
		case "forbidden":
			http.Error(w, "you can only delete your own posts", http.StatusForbidden)
			return
		default:
			http.Error(w, "failed to delete post", http.StatusInternalServerError)
			return
		}
	}

	ws.NotifyPostDeleted(userID, postID)
	w.WriteHeader(http.StatusNoContent)
}
