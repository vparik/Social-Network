// server initialization (done)
package server

import (
	"context"
	"net/http"
	"os"
	"time"

	"socialnet/internal/database"
	"socialnet/internal/database/store"

	"github.com/Des1red/goauthlib/goauth"
)

type Server struct {
	mux    *http.ServeMux
	server *http.Server
}

func new(addr string) *Server {
	mux := http.NewServeMux()

	s := &Server{
		mux: mux,
		server: &http.Server{
			Addr:         addr,
			Handler:      mux,
			ReadTimeout:  10 * time.Second,
			WriteTimeout: 10 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}

	s.registerRoutes()

	return s
}

func (s *Server) start() error {
	return s.server.ListenAndServe()
}

func (s *Server) shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func InitServer() {
	// initialize db
	if err := database.Init("socialnet.db"); err != nil {
		panic(err)
	}
	// Required auth setup
	goauth.JWTSecret([]byte(os.Getenv("JWT_SECRET")))
	// use db
	goauth.UseStore(store.NewAuthTokenStore())

	// Optional cookie config
	goauth.Cookies(goauth.CookieConfig{
		Secure:   false, // this needs to be true on prod
		SameSite: http.SameSiteStrictMode,
	})

	goauth.Roles(goauth.RolesConfig{
		Anonymous: "guest",
		User:      "member",
		Admin:     "owner",
	})

	goauth.Errors(func(w http.ResponseWriter, r *http.Request, err error) {
		w.Header().Set("Content-Type", "application/json")

		switch err {
		case goauth.ErrUnauthorized:
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"unauthorized"}`))
		case goauth.ErrForbidden:
			w.WriteHeader(http.StatusForbidden)
			w.Write([]byte(`{"error":"forbidden"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_auth_error"}`))
		}
	})

	s := new(":8080")

	if err := s.start(); err != nil {
		panic(err)
	}
}
