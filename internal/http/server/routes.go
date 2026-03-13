// this is where you add routes
package server

import (
	"log"
	"net/http"
	"socialnet/internal/http/handlers"

	"github.com/Des1red/goauthlib/goauth"
)

func (s *Server) registerRoutes() {
	log.Println("Registering routes...")

	// ---------------- API ----------------

	s.mux.HandleFunc("POST /api/login", goauth.Auth(handlers.Login))
	s.mux.HandleFunc("POST /api/register", goauth.Auth(handlers.Register))

	s.mux.HandleFunc("POST /api/logout", goauth.ProtectedCsrfActive(handlers.Logout))
	s.mux.HandleFunc("POST /api/posts", goauth.ProtectedCsrfActive(handlers.CreatePost))
	s.mux.HandleFunc("DELETE /api/posts/{id}", goauth.ProtectedCsrfActive(handlers.DeletePost))

	s.mux.HandleFunc("GET /api/home", goauth.Protected(handlers.Home))
	s.mux.HandleFunc("GET /api/profile", goauth.Protected(handlers.GetProfile))
	s.mux.HandleFunc("GET /api/profile/{id}", goauth.Protected(handlers.GetProfile))

	// ---------------- STATIC ----------------

	fs := http.FileServer(http.Dir("./web"))
	s.mux.Handle("GET /css/", fs)
	s.mux.Handle("GET /js/", fs)

	// ---------------- PUBLIC PAGES ----------------

	s.mux.HandleFunc("GET /login", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	})

	s.mux.HandleFunc("GET /register", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	})

	s.mux.HandleFunc("GET /", (func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	}))

	log.Println("Routes registered")
}
