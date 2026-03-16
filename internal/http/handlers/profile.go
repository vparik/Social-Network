package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/models"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

func GetProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	targetID, ok := resolveTargetUserID(w, r)
	if !ok {
		return
	}

	user, ok := fetchUser(w, targetID)
	if !ok {
		return
	}

	json.NewEncoder(w).Encode(user)
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

// Add this when profile privacy is available
//
// if !user.IsPublic && user.ID != payload.UserID {
// 	w.WriteHeader(http.StatusForbidden)
// 	w.Write([]byte(`{"error":"profile_private"}`))
// 	return
// }
