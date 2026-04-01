package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

// POST /api/groups/{id}/posts
func CreateGroupPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	var body struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		ImageURL string `json:"imageUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_body"}`))
		return
	}

	post, err := store.CreateGroupPost(groupID, payload.UserID, body.Title, body.Content, body.ImageURL)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	ws.NotifyGroupPostCreated(post)

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(post)
}

// GET /api/groups/{id}/posts
func GetGroupPosts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	posts, err := store.GetGroupPosts(groupID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(posts)
}

// DELETE /api/groups/{id}/posts/{postID}
func DeleteGroupPost(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	postID, err := strconv.Atoi(r.PathValue("postID"))
	if err != nil || postID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_post_id"}`))
		return
	}

	if err := store.DeleteGroupPost(postID, payload.UserID); err != nil {
		switch err.Error() {
		case "forbidden":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		case "group_post_not_found":
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"post_not_found"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	ws.NotifyGroupPostDeleted(groupID, postID)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// POST /api/groups/{id}/posts/{postID}/comments
func CreateGroupComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	postID, err := strconv.Atoi(r.PathValue("postID"))
	if err != nil || postID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_post_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	var body struct {
		Content  string `json:"content"`
		ImageURL string `json:"imageUrl"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Content == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_body"}`))
		return
	}

	comment, err := store.CreateGroupComment(postID, payload.UserID, body.Content, body.ImageURL)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	ws.NotifyGroupCommentCreated(groupID, comment)

	// Notify the post owner (if they're not the commenter)
	if post, err := store.GetGroupPostByID(postID); err == nil && post.UserID != payload.UserID {
		if err := store.CreateNotification(post.UserID, payload.UserID, "group_comment", &groupID); err == nil {
			if n, err := store.GetLatestNotification(post.UserID); err == nil {
				if unread, err := store.CountUnreadNotifications(post.UserID); err == nil {
					ws.NotifyNotificationCreated(post.UserID, n, unread)
				}
			}
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(comment)
}

// GET /api/groups/{id}/posts/{postID}/comments
func GetGroupComments(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	postID, err := strconv.Atoi(r.PathValue("postID"))
	if err != nil || postID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_post_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	comments, err := store.GetGroupComments(postID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(comments)
}

// DELETE /api/groups/{id}/comments/{commentID}
func DeleteGroupComment(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	commentID, err := strconv.Atoi(r.PathValue("commentID"))
	if err != nil || commentID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_comment_id"}`))
		return
	}

	// Need the postID before deletion for the WS notification
	postID := 0
	if comment, err := store.GetGroupCommentByID(commentID); err == nil {
		postID = comment.PostID
	}

	if err := store.DeleteGroupComment(commentID, payload.UserID); err != nil {
		switch err.Error() {
		case "forbidden":
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		case "group_comment_not_found":
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"comment_not_found"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	ws.NotifyGroupCommentDeleted(groupID, postID, commentID)

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}
