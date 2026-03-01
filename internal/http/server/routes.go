// this is where you add routes
package server

import (
	"socialnet/internal/http/handlers"

	"github.com/Des1red/goauthlib/goauth"
)

func (s *Server) registerRoutes() {

	// Public routes
	s.mux.HandleFunc("POST /login",
		goauth.Auth(handlers.Login),
	)

	s.mux.HandleFunc("POST /register",
		goauth.Auth(handlers.Register),
	)

	// State-changing (CSRF enforced)
	s.mux.HandleFunc("POST /logout",
		goauth.ProtectedCsrfActive(handlers.Logout),
	)

	s.mux.HandleFunc("POST /posts",
		goauth.ProtectedCsrfActive(handlers.CreatePost),
	)

	s.mux.HandleFunc("DELETE /posts/{id}",
		goauth.ProtectedCsrfActive(handlers.DeletePost),
	)

	// home
	s.mux.HandleFunc("GET /home",
		goauth.Protected(handlers.Home),
	)
}
