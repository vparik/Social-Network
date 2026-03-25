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

func GetProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	targetID, ok := resolveTargetUserID(w, r)
	if !ok {
		return
	}

	user, ok := fetchUser(w, targetID)
	if !ok {
		return
	}

	isOwnProfile := user.ID == payload.UserID

	relationship := map[string]bool{
		"following":       false,
		"requested":       false,
		"incomingRequest": false,
	}

	if !isOwnProfile {
		following, err := store.IsFollowing(payload.UserID, user.ID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
			return
		}

		requested, err := store.HasFollowRequest(payload.UserID, user.ID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
			return
		}

		incomingRequest, err := store.HasFollowRequest(user.ID, payload.UserID)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
			return
		}

		relationship["following"] = following
		relationship["requested"] = requested
		relationship["incomingRequest"] = incomingRequest
	}

	canViewContent := isOwnProfile || user.IsPublic || relationship["following"]

	json.NewEncoder(w).Encode(map[string]any{
		"user":           user,
		"isOwnProfile":   isOwnProfile,
		"canViewContent": canViewContent,
		"relationship":   relationship,
	})
}

func resolveTargetUserID(w http.ResponseWriter, r *http.Request) (int, bool) {

	payload := goauth.FromContext(r.Context())
	rawID := r.URL.Query().Get("id")

	// /profile?id=me OR /profile
	if rawID == "" || rawID == "me" {
		return payload.UserID, true
	}

	// /profile?id=12
	id, err := strconv.Atoi(rawID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_user_id"}`))
		return 0, false
	}
	return id, true
}

func fetchUser(w http.ResponseWriter, id int) (*models.User, bool) {

	user, err := store.GetUserByID(id)
	if err != nil {

		if err.Error() == "user_not_found" {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"user_not_found"}`))
			return nil, false
		}

		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return nil, false
	}
	return user, true
}

func SetProfilePrivacy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := goauth.FromContext(r.Context())

	var body struct {
		IsPublic bool `json:"isPublic"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := store.SetUserPrivacy(payload.UserID, body.IsPublic); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	user, err := store.GetUserByID(payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	ws.NotifyProfilePrivacyChanged(user.ID, user.IsPublic)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}
