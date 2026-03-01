package handlers

import (
	"net/http"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

func CreatePost(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	w.Write([]byte("create post for user " + strconv.Itoa(payload.UserID)))
}

func DeletePost(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	w.Write([]byte("delete post by user " + strconv.Itoa(payload.UserID)))
}
