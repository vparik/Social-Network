// login register logout handlers (done)
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"socialnet/internal/database/store"

	"github.com/Des1red/goauthlib/goauth"
	"golang.org/x/crypto/bcrypt"
)

type authRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type registerRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	DateOfBirth string `json:"date_of_birth"`
	AvatarPath  string `json:"avatar_path"` // optional
	Nickname    string `json:"nickname"`    // optional
	AboutMe     string `json:"about_me"`    // optional
}

func Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// required fields only
	if req.Email == "" || req.Password == "" || req.FirstName == "" || req.LastName == "" || req.DateOfBirth == "" {
		http.Error(w, "missing required fields", http.StatusBadRequest)
		return
	}

	// hash the PASSWORD
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}

	err = store.CreateUser(
		req.Email,
		string(hash),
		goauth.RoleUser(),
		req.FirstName,
		req.LastName,
		req.DateOfBirth,
		req.AvatarPath,
		req.Nickname,
		req.AboutMe,
	)
	if err != nil {
		http.Error(w, "user already exists", http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "registered"})
}

func Login(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	user, err := store.GetUserByEmail(req.Email)
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
	log.Println("ROLE FROM DB:", user.Role)
	w.Write([]byte(`{"status":"logged_in"}`))
}

func Logout(w http.ResponseWriter, r *http.Request) {
	// revoke tokens + expire cookies
	goauth.Logout(w, r)

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"logged_out"}`))
}
