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

	// API
	s.mux.HandleFunc("POST /login", goauth.Auth(handlers.Login))
	s.mux.HandleFunc("POST /register", goauth.Auth(handlers.Register))

	s.mux.HandleFunc("POST /logout", goauth.ProtectedCsrfActive(handlers.Logout))
	s.mux.HandleFunc("POST /posts", goauth.ProtectedCsrfActive(handlers.CreatePost))
	s.mux.HandleFunc("DELETE /posts/{id}", goauth.ProtectedCsrfActive(handlers.DeletePost))

	s.mux.HandleFunc("GET /", goauth.Protected(handlers.Home))

	// STATIC
	fs := http.FileServer(http.Dir("./web"))
	s.mux.Handle("GET /css/", fs)
	s.mux.Handle("GET /js/", fs)

	// SPA fallback
	s.mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	})
	log.Println("Routes registered")

}
