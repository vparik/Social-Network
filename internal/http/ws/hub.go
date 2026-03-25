// Package ws manages active websocket connections.
//
// The hub keeps track of which authenticated users are currently connected
// to the websocket so the server can:
//   - route private messages to online users
//   - check online presence
//   - broadcast presence changes to other connected users
//
// Current behavior:
//   - one active websocket connection per user
//   - a new connection for the same user replaces the old one
//   - presence is derived from the current in-memory connections
package ws

import (
	"socialnet/internal/models"
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	mu      sync.RWMutex
	clients map[int]*websocket.Conn
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[int]*websocket.Conn),
	}
}

func (h *Hub) Add(userID int, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if old, ok := h.clients[userID]; ok && old != nil {
		old.Close()
	}

	h.clients[userID] = conn
}

func (h *Hub) Remove(userID int, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	current, ok := h.clients[userID]
	if ok && current == conn {
		delete(h.clients, userID)
	}
}

func (h *Hub) Get(userID int) (*websocket.Conn, bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	conn, ok := h.clients[userID]
	return conn, ok
}

func (h *Hub) OnlineUserIDs() []int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	ids := make([]int, 0, len(h.clients))
	for userID := range h.clients {
		ids = append(ids, userID)
	}
	return ids
}

func onlineUserIDsExcept(excludeUserID int) []int {
	ids := Manager.OnlineUserIDs()
	out := make([]int, 0, len(ids))

	for _, id := range ids {
		if id == excludeUserID {
			continue
		}
		out = append(out, id)
	}

	return out
}

func (h *Hub) SendToMany(userIDs []int, event models.ChatEvent) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for _, userID := range userIDs {
		conn, ok := h.clients[userID]
		if !ok || conn == nil {
			continue
		}
		_ = conn.WriteJSON(event)
	}
}

func (h *Hub) BroadcastPresence(userID int, online bool) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	event := models.ChatEvent{
		Type: "presence",
		Data: models.PresencePayload{
			UserID: userID,
			Online: online,
		},
	}

	for id, conn := range h.clients {
		if id == userID {
			continue
		}
		_ = conn.WriteJSON(event)
	}
}
