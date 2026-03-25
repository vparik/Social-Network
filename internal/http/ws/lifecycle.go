package ws

import (
	"socialnet/internal/models"

	"github.com/gorilla/websocket"
)

func registerConnection(userID int, conn *websocket.Conn) {
	Manager.Add(userID, conn)
	Manager.BroadcastPresence(userID, true)

	_ = conn.WriteJSON(models.ChatEvent{
		Type: "presence_snapshot",
		Data: models.PresenceSnapshotPayload{
			UserIDs: Manager.OnlineUserIDs(),
		},
	})
}

func unregisterConnection(userID int, conn *websocket.Conn) {
	Manager.Remove(userID, conn)
	Manager.BroadcastPresence(userID, false)
}
