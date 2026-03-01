// login register logout handlers (done)
package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"

	"github.com/Des1red/goauthlib/goauth"
	"golang.org/x/crypto/bcrypt"
)

type authRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func Register(w http.ResponseWriter, r *http.Request) {

	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		http.Error(w, "missing fields", http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	err = store.CreateUser(req.Username, string(hash), "member")
	if err != nil {
		http.Error(w, "user exists", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte(`{"status":"registered"}`))
}

func Login(w http.ResponseWriter, r *http.Request) {

	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	user, err := store.GetUserByUsername(req.Username)
	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword(
		[]byte(user.PasswordHash),
		[]byte(req.Password),
	)

	if err != nil {
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	// issue tokens
	goauth.Login(w, user.Role, user.ID)

	w.Write([]byte(`{"status":"logged_in"}`))
}

func Logout(w http.ResponseWriter, r *http.Request) {

	// revoke tokens + expire cookies
	goauth.Logout(w, r)

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"logged_out"}`))
}
