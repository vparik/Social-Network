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
// Expects a JSON body:
// { "title": "", "content": "", "privacy": "", "allowedUserIds": [] }
//
// privacy must be:
//   - "public"
//   - "selected" (followers only)
//   - "private"  (explicitly chosen users)
func CreatePost(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	var body struct {
		Title          string `json:"title"`
		Content        string `json:"content"`
		Privacy        string `json:"privacy"`
		ImageURL       string `json:"imageUrl"`
		AllowedUserIDs []int  `json:"allowedUserIds"`
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

	if body.Privacy == "" {
		body.Privacy = "public"
	}

	switch body.Privacy {
	case "public", "selected", "private":
	default:
		http.Error(w, "invalid privacy", http.StatusBadRequest)
		return
	}

	if body.Privacy != "private" && len(body.AllowedUserIDs) > 0 {
		http.Error(w, "allowed users are only valid for private posts", http.StatusBadRequest)
		return
	}

	post, err := store.CreatePost(userID, body.Title, body.Content, body.Privacy, body.ImageURL)
	if err != nil {
		http.Error(w, "failed to create post", http.StatusInternalServerError)
		return
	}

	if body.Privacy == "private" {
		var filtered []int
		seen := make(map[int]bool)

		for _, allowedUserID := range body.AllowedUserIDs {
			if allowedUserID <= 0 {
				continue
			}
			if allowedUserID == userID {
				continue
			}
			if seen[allowedUserID] {
				continue
			}
			seen[allowedUserID] = true
			filtered = append(filtered, allowedUserID)
		}

		if len(filtered) > 0 {
			if err := store.AddAllowedUsersToPost(post.ID, filtered); err != nil {
				http.Error(w, "failed to save allowed users", http.StatusInternalServerError)
				return
			}
		}
	}

	ws.NotifyPostCreated(post)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GetPosts handles GET /api/posts.
// Returns all visible posts ordered by newest first.
func GetPosts(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())

	posts, err := store.GetPosts(payload.UserID)
	if err != nil {
		http.Error(w, "failed to fetch posts", http.StatusInternalServerError)
		return
	}

	if posts == nil {
		posts = []*models.Post{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}

// DeletePost handles DELETE /api/posts/{id}.
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
