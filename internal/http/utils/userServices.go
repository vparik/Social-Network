package utils

import (
	"errors"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/models"

	"github.com/Des1red/goauthlib/goauth"
)

func GetLoggedInUser(r *http.Request) (*models.User, error) {
	payload := goauth.FromContext(r.Context())
	if payload == nil {
		return nil, errors.New("unauthorized")
	}
	return store.GetUserByID(payload.UserID)
}