package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

func GetProfile(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	payload := goauth.FromContext(r.Context())

	rawID := r.PathValue("id")

	var targetID int
	var err error

	if rawID == "" {
		targetID = payload.UserID
	} else {
		targetID, err = strconv.Atoi(rawID)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`{"error":"invalid_user_id"}`))
			return
		}
	}

	user, err := store.GetUserByID(targetID)
	if err != nil {
		if err.Error() == "user_not_found" {
			w.WriteHeader(http.StatusNotFound)
			w.Write([]byte(`{"error":"user_not_found"}`))
			return
		}

		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(user)
}
