// this is where you add routes
package server

import (
	"log"
	"net/http"
	"socialnet/internal/http/handlers"
	"socialnet/internal/http/handlers/chat"
	"socialnet/internal/http/ws"

	"github.com/Des1red/goauthlib/goauth"
)

func (s *Server) registerRoutes() {
	log.Println("Registering routes...")

	// ---------------- API ----------------

	s.mux.HandleFunc("POST /api/login", goauth.Auth(handlers.Login))
	s.mux.HandleFunc("POST /api/register", goauth.Auth(handlers.Register))

	s.mux.HandleFunc("POST /api/logout", goauth.Protected(handlers.Logout))
	s.mux.HandleFunc("POST /api/posts", goauth.ProtectedCsrfActive(handlers.CreatePost))
	s.mux.HandleFunc("GET /api/posts", goauth.Protected(handlers.GetPosts))
	s.mux.HandleFunc("DELETE /api/posts/{id}", goauth.ProtectedCsrfActive(handlers.DeletePost))
	s.mux.HandleFunc("POST /api/posts/{id}/comments", goauth.ProtectedCsrfActive(handlers.CreateComment))
	s.mux.HandleFunc("GET /api/posts/{id}/comments", goauth.Protected(handlers.GetComments))

	s.mux.HandleFunc("POST /api/events", goauth.ProtectedCsrfActive(handlers.CreateEvent))
	s.mux.HandleFunc("GET /api/events", goauth.Protected(handlers.GetEvents))

	s.mux.HandleFunc("GET /api/home", goauth.Protected(handlers.Home))
	s.mux.HandleFunc("GET /api/profile", goauth.Protected(handlers.GetProfile))

	s.mux.HandleFunc("POST /api/follow", goauth.ProtectedCsrfActive(handlers.Follow))
	s.mux.HandleFunc("DELETE /api/follow", goauth.ProtectedCsrfActive(handlers.Unfollow))
	s.mux.HandleFunc("GET /api/follow/status", goauth.Protected(handlers.FollowStatus))
	s.mux.HandleFunc("GET /api/followers", goauth.Protected(handlers.GetFollowers))
	s.mux.HandleFunc("GET /api/following", goauth.Protected(handlers.GetFollowing))
	s.mux.HandleFunc("GET /api/users/search", goauth.Protected(handlers.SearchUsers))
	// ---------------- CHAT ------------------
	s.mux.HandleFunc("GET /api/chat/users", goauth.Protected(chat.GetChatUsers))
	s.mux.HandleFunc("GET /api/messages", goauth.Protected(chat.GetConversation))

	// ---------------- WS --------------------
	s.mux.HandleFunc("GET /ws", goauth.Protected(ws.WS))
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

	s.mux.HandleFunc("GET /profile", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	})

	log.Println("Routes registered")
}
