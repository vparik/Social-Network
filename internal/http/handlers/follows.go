package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/chat"
	"socialnet/internal/models"
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

	if err := store.Follow(payload.UserID, targetID); err != nil {
		if err.Error() == "cannot_follow_self" {
			http.Error(w, `{"error":"cannot_follow_self"}`, http.StatusBadRequest)
		} else {
			http.Error(w, `{"error":"internal_error"}`, http.StatusInternalServerError)
		}
		return
	}

	affectedUserIDs, err := store.GetAffectedRelationshipUserIDs(payload.UserID, targetID)
	if err == nil {
		chat.Manager.SendToMany(affectedUserIDs, models.ChatEvent{
			Type: "relationship_changed",
			Data: models.RelationshipChangedPayload{
				ActorID:  payload.UserID,
				TargetID: targetID,
				Action:   "follow",
				Entity:   "follow",
				Scope:    "relationship",
			},
		})
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
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

	affectedUserIDs, _ := store.GetAffectedRelationshipUserIDs(payload.UserID, targetID)

	if err := store.Unfollow(payload.UserID, targetID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	if len(affectedUserIDs) > 0 {
		chat.Manager.SendToMany(affectedUserIDs, models.ChatEvent{
			Type: "relationship_changed",
			Data: models.RelationshipChangedPayload{
				ActorID:  payload.UserID,
				TargetID: targetID,
				Action:   "unfollow",
				Entity:   "follow",
				Scope:    "relationship",
			},
		})
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"ok":true}`))
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

	json.NewEncoder(w).Encode(map[string]bool{"following": following})
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
