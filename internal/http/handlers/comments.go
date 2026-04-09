package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"
	"socialnet/internal/models"
	"strconv"
	"strings"

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
		Content  string `json:"content"`
		ImageURL string `json:"imageUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}
	content := strings.TrimSpace(body.Content)
	imageURL := strings.TrimSpace(body.ImageURL)

	if content == "" && imageURL == "" {
		http.Error(w, "comment must have content or image", http.StatusBadRequest)
		return
	}

	comment, err := store.CreateComment(postID, userID, content, imageURL)
	if err != nil {
		http.Error(w, "failed to create comment", http.StatusInternalServerError)
		return
	}
	if post, err := store.GetPostByID(postID); err == nil && post.UserID != userID {
		if err := store.CreateNotification(post.UserID, userID, "comment", &comment.ID); err == nil {
			if n, err := store.GetLatestNotification(post.UserID); err == nil {
				n.PostID = &postID
				n.CommentID = &comment.ID

				if unread, err := store.CountUnreadNotifications(post.UserID); err == nil {
					ws.NotifyNotificationCreated(post.UserID, n, unread)
				}
			}
		}
	}

	ws.NotifyCommentCreated(comment)
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

func DeleteComment(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	commentIDRaw := r.PathValue("id")
	commentID, err := strconv.Atoi(commentIDRaw)
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return
	}

	postID, err := store.DeleteComment(commentID, userID)
	if err != nil {
		switch err.Error() {
		case "comment_not_found":
			http.Error(w, "comment not found", http.StatusNotFound)
			return
		case "forbidden":
			http.Error(w, "you can only delete your own comments", http.StatusForbidden)
			return
		default:
			http.Error(w, "failed to delete comment", http.StatusInternalServerError)
			return
		}
	}

	ws.NotifyCommentDeleted(postID, commentID, userID)
	w.WriteHeader(http.StatusNoContent)
}
