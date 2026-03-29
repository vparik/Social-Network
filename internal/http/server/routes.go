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

	s.mux.HandleFunc("POST /api/login", handlers.Login)
	s.mux.HandleFunc("POST /api/register", handlers.Register)

	s.mux.HandleFunc("POST /api/logout", goauth.Protected(handlers.Logout))
	s.mux.HandleFunc("POST /api/posts", goauth.ProtectedCsrfActive(handlers.CreatePost))
	s.mux.HandleFunc("GET /api/posts", goauth.Protected(handlers.GetPosts))
	s.mux.HandleFunc("DELETE /api/posts/{id}", goauth.ProtectedCsrfActive(handlers.DeletePost))
	s.mux.HandleFunc("POST /api/posts/{id}/comments", goauth.ProtectedCsrfActive(handlers.CreateComment))
	s.mux.HandleFunc("GET /api/posts/{id}/comments", goauth.Protected(handlers.GetComments))
	s.mux.HandleFunc("DELETE /api/comments/{id}", goauth.ProtectedCsrfActive(handlers.DeleteComment))

	s.mux.HandleFunc("POST /api/events", goauth.ProtectedCsrfActive(handlers.CreateEvent))
	s.mux.HandleFunc("GET /api/events", goauth.Protected(handlers.GetEvents))

	s.mux.HandleFunc("GET /api/home", goauth.Protected(handlers.Home))
	s.mux.HandleFunc("GET /api/profile", goauth.Protected(handlers.GetProfile))
	s.mux.HandleFunc("POST /api/profile/privacy", goauth.ProtectedCsrfActive(handlers.SetProfilePrivacy))

	s.mux.HandleFunc("POST /api/follow", goauth.ProtectedCsrfActive(handlers.Follow))
	s.mux.HandleFunc("DELETE /api/follow", goauth.ProtectedCsrfActive(handlers.Unfollow))
	s.mux.HandleFunc("GET /api/follow/status", goauth.Protected(handlers.FollowStatus))
	s.mux.HandleFunc("GET /api/followers", goauth.Protected(handlers.GetFollowers))
	s.mux.HandleFunc("GET /api/following", goauth.Protected(handlers.GetFollowing))
	s.mux.HandleFunc("POST /api/follow/accept", goauth.ProtectedCsrfActive(handlers.AcceptFollowRequest))
	s.mux.HandleFunc("DELETE /api/follow/request", goauth.ProtectedCsrfActive(handlers.RejectFollowRequest))
	s.mux.HandleFunc("GET /api/follow/requests", goauth.Protected(handlers.GetFollowRequests))

	s.mux.HandleFunc("GET /api/users/search", goauth.Protected(handlers.SearchUsers))
	s.mux.HandleFunc("GET /api/notifications", goauth.Protected(handlers.GetNotifications))
	s.mux.HandleFunc("POST /api/notifications/read-all", goauth.ProtectedCsrfActive(handlers.MarkAllNotificationsRead))
	// ---------------- GROUPS ----------------
	s.mux.HandleFunc("POST /api/groups", goauth.ProtectedCsrfActive(handlers.CreateGroup))
	s.mux.HandleFunc("GET /api/groups", goauth.Protected(handlers.GetGroups))
	s.mux.HandleFunc("GET /api/groups/invites", goauth.Protected(handlers.GetMyGroupInvites))
	s.mux.HandleFunc("GET /api/groups/{id}", goauth.Protected(handlers.GetGroup))
	s.mux.HandleFunc("GET /api/groups/{id}/members", goauth.Protected(handlers.GetGroupMembers))
	s.mux.HandleFunc("POST /api/groups/{id}/join", goauth.ProtectedCsrfActive(handlers.JoinGroup))
	s.mux.HandleFunc("DELETE /api/groups/{id}/members", goauth.ProtectedCsrfActive(handlers.LeaveGroup))
	s.mux.HandleFunc("POST /api/groups/{id}/invite", goauth.ProtectedCsrfActive(handlers.InviteToGroup))
	s.mux.HandleFunc("GET /api/groups/{id}/requests", goauth.Protected(handlers.GetGroupJoinRequests))
	s.mux.HandleFunc("POST /api/groups/{id}/requests/{userID}/accept", goauth.ProtectedCsrfActive(handlers.AcceptGroupJoinRequest))
	s.mux.HandleFunc("DELETE /api/groups/{id}/requests/{userID}", goauth.ProtectedCsrfActive(handlers.DeclineGroupJoinRequest))
	s.mux.HandleFunc("POST /api/groups/{id}/invites/accept", goauth.ProtectedCsrfActive(handlers.AcceptGroupInvite))
	s.mux.HandleFunc("DELETE /api/groups/{id}/invites", goauth.ProtectedCsrfActive(handlers.DeclineGroupInvite))
	s.mux.HandleFunc("POST /api/groups/{id}/posts", goauth.ProtectedCsrfActive(handlers.CreateGroupPost))
	s.mux.HandleFunc("GET /api/groups/{id}/posts", goauth.Protected(handlers.GetGroupPosts))
	s.mux.HandleFunc("DELETE /api/groups/{id}/posts/{postID}", goauth.ProtectedCsrfActive(handlers.DeleteGroupPost))
	s.mux.HandleFunc("POST /api/groups/{id}/posts/{postID}/comments", goauth.ProtectedCsrfActive(handlers.CreateGroupComment))
	s.mux.HandleFunc("GET /api/groups/{id}/posts/{postID}/comments", goauth.Protected(handlers.GetGroupComments))
	s.mux.HandleFunc("DELETE /api/groups/{id}/comments/{commentID}", goauth.ProtectedCsrfActive(handlers.DeleteGroupComment))
	s.mux.HandleFunc("POST /api/groups/{id}/events", goauth.ProtectedCsrfActive(handlers.CreateGroupEvent))
	s.mux.HandleFunc("GET /api/groups/{id}/events", goauth.Protected(handlers.GetGroupEvents))
	s.mux.HandleFunc("POST /api/groups/{id}/events/{eventID}/vote", goauth.ProtectedCsrfActive(handlers.VoteOnGroupEvent))
	s.mux.HandleFunc("GET /api/groups/{id}/messages", goauth.Protected(handlers.GetGroupMessages))

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

	s.mux.HandleFunc("GET /groups", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	})

	s.mux.HandleFunc("GET /group", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./web/index.html")
	})

	log.Println("Routes registered")
}
