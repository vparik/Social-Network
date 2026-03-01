package handlers

import (
	"net/http"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

func Home(w http.ResponseWriter, r *http.Request) {

	payload := goauth.FromContext(r.Context())

	w.Write([]byte("welcome user " + strconv.Itoa(payload.UserID)))
}
