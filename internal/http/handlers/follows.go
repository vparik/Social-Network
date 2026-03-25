package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

// POST /api/follow?id={userID}
func Follow(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	targetID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil || targetID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if payload.UserID == targetID {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"cannot_follow_self"}`))
		return
	}

	targetUser, err := store.GetUserByID(targetID)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"user_not_found"}`))
		return
	}

	following, err := store.IsFollowing(payload.UserID, targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if following {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true,"following":true,"requested":false}`))
		return
	}

	if targetUser.IsPublic {
		if err := store.Follow(payload.UserID, targetID); err != nil {
			if err.Error() == "cannot_follow_self" {
				w.WriteHeader(http.StatusBadRequest)
				w.Write([]byte(`{"error":"cannot_follow_self"}`))
			} else {
				w.WriteHeader(http.StatusInternalServerError)
				w.Write([]byte(`{"error":"internal_error"}`))
			}
			return
		}

		_ = store.DeleteFollowRequest(payload.UserID, targetID)

		if err := store.CreateNotification(targetID, payload.UserID, "follow", nil); err == nil {
			if n, err := store.GetLatestNotification(targetID); err == nil {
				if unread, err := store.CountUnreadNotifications(targetID); err == nil {
					ws.NotifyNotificationCreated(targetID, n, unread)
				}
			}
		}

		affectedUserIDs, err := store.GetAffectedRelationshipUserIDs(payload.UserID, targetID)
		if err == nil {
			ws.NotifyRelationshipChanged(affectedUserIDs, payload.UserID, targetID, "follow")
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true,"following":true,"requested":false}`))
		return
	}

	requested, err := store.HasFollowRequest(payload.UserID, targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if requested {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true,"following":false,"requested":true}`))
		return
	}

	if err := store.CreateFollowRequest(payload.UserID, targetID); err != nil {
		if err.Error() == "cannot_follow_self" {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`{"error":"cannot_follow_self"}`))
		} else {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	if err := store.CreateNotification(targetID, payload.UserID, "follow_request", nil); err == nil {
		if n, err := store.GetLatestNotification(targetID); err == nil {
			if unread, err := store.CountUnreadNotifications(targetID); err == nil {
				ws.NotifyNotificationCreated(targetID, n, unread)
			}
		}
	}

	ws.NotifyRelationshipChanged([]int{payload.UserID, targetID}, payload.UserID, targetID, "follow_requested")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true,"following":false,"requested":true}`))
}

// DELETE /api/follow?id={userID}
func Unfollow(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	targetID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil || targetID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	following, err := store.IsFollowing(payload.UserID, targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if following {
		affectedUserIDs, _ := store.GetAffectedRelationshipUserIDs(payload.UserID, targetID)

		if err := store.Unfollow(payload.UserID, targetID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
			return
		}

		ws.NotifyRelationshipChanged(affectedUserIDs, payload.UserID, targetID, "unfollow")

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true,"following":false,"requested":false}`))
		return
	}

	requested, err := store.HasFollowRequest(payload.UserID, targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if requested {
		if err := store.DeleteFollowRequest(payload.UserID, targetID); err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
			return
		}

		ws.NotifyRelationshipChanged([]int{payload.UserID, targetID}, payload.UserID, targetID, "follow_request_cancelled")

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true,"following":false,"requested":false}`))
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true,"following":false,"requested":false}`))
}

// GET /api/follow/status?id={userID}
func FollowStatus(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	targetID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil || targetID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	following, err := store.IsFollowing(payload.UserID, targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	requested, err := store.HasFollowRequest(payload.UserID, targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(map[string]bool{
		"following": following,
		"requested": requested,
	})
}

// GET /api/followers?id={userID}
func GetFollowers(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	targetID, ok := resolveTargetUserID(w, r)
	if !ok {
		return
	}

	users, err := store.GetFollowers(targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(users)
}

// GET /api/following?id={userID}
func GetFollowing(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	targetID, ok := resolveTargetUserID(w, r)
	if !ok {
		return
	}

	users, err := store.GetFollowing(targetID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(users)
}

// POST /api/follow/accept?id={requesterID}
func AcceptFollowRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	requesterID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil || requesterID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if requesterID == payload.UserID {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if err := store.AcceptFollowRequest(requesterID, payload.UserID); err != nil {
		if err.Error() == "follow_request_not_found" {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"follow_request_not_found"}`))
			return
		}

		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if err := store.CreateNotification(requesterID, payload.UserID, "follow_request_accepted", nil); err == nil {
		if n, err := store.GetLatestNotification(requesterID); err == nil {
			if unread, err := store.CountUnreadNotifications(requesterID); err == nil {
				ws.NotifyNotificationCreated(requesterID, n, unread)
			}
		}
	}

	affectedUserIDs, err := store.GetAffectedRelationshipUserIDs(requesterID, payload.UserID)
	if err == nil {
		ws.NotifyRelationshipChanged(affectedUserIDs, requesterID, payload.UserID, "follow")
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// DELETE /api/follow/request?id={requesterID}
func RejectFollowRequest(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	requesterID, err := strconv.Atoi(r.URL.Query().Get("id"))
	if err != nil || requesterID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	if requesterID == payload.UserID {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return
	}

	exists, err := store.HasFollowRequest(requesterID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if !exists {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"error":"follow_request_not_found"}`))
		return
	}

	if err := store.DeleteFollowRequest(requesterID, payload.UserID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	ws.NotifyRelationshipChanged([]int{requesterID, payload.UserID}, requesterID, payload.UserID, "follow_request_rejected")

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
}

// GET /api/follow/requests
func GetFollowRequests(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	users, err := store.GetFollowRequests(payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(users)
}
