// Package chat contains websocket handlers for real-time private messaging.
//
// ChatWS upgrades an authenticated request into a websocket connection and
// handles the live chat event loop.
//
// Current responsibilities:
//   - register the user as online in the chat hub
//   - broadcast online/offline presence updates
//   - send the newly connected user a presence snapshot
//   - receive outgoing private messages from the client
//   - deliver messages instantly to online recipients
//   - update delivered/read message state
//   - notify senders when their messages are read
//
// This handler is focused on live transport only. Message history is loaded
// separately through the conversation HTTP endpoint.
package chat

import (
	"encoding/json"
	"log"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/chat"
	"socialnet/internal/models"

	"github.com/Des1red/goauthlib/goauth"
	"github.com/gorilla/websocket"
)

var chatUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func ChatWS(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	if payload == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := chatUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ws upgrade error:", err)
		return
	}
	defer conn.Close()

	userID := payload.UserID
	chat.Manager.Add(userID, conn)
	chat.Manager.BroadcastPresence(userID, true)

	_ = conn.WriteJSON(models.ChatEvent{
		Type: "presence_snapshot",
		Data: models.PresenceSnapshotPayload{
			UserIDs: chat.Manager.OnlineUserIDs(),
		},
	})

	defer func() {
		chat.Manager.Remove(userID, conn)
		chat.Manager.BroadcastPresence(userID, false)
	}()
	for {
		var raw struct {
			Type string          `json:"type"`
			Data json.RawMessage `json:"data"`
		}

		if err := conn.ReadJSON(&raw); err != nil {
			log.Println("ws read error:", err)
			return
		}

		switch raw.Type {
		case "send_message":
			var msgReq models.SendMessagePayload
			if err := json.Unmarshal(raw.Data, &msgReq); err != nil {
				continue
			}

			if msgReq.ReceiverID == 0 || msgReq.Content == "" {
				continue
			}

			msg, err := store.CreateMessage(userID, msgReq.ReceiverID, msgReq.Content)
			if err != nil {
				continue
			}

			// sender confirmation
			_ = conn.WriteJSON(models.ChatEvent{
				Type: "message_sent",
				Data: msg,
			})

			// deliver to receiver if online
			if receiverConn, ok := chat.Manager.Get(msgReq.ReceiverID); ok {
				if err := receiverConn.WriteJSON(models.ChatEvent{
					Type: "message_received",
					Data: msg,
				}); err == nil {
					if receivedAt, err := store.MarkMessageReceived(msg.ID); err == nil {
						msg.ReceivedAt = receivedAt
					}

					_ = conn.WriteJSON(models.ChatEvent{
						Type: "message_status",
						Data: models.MessageStatusPayload{
							MessageID: msg.ID,
							Status:    "received",
						},
					})
				}
			}

		case "mark_read":
			var status struct {
				MessageID int `json:"messageId"`
			}
			if err := json.Unmarshal(raw.Data, &status); err != nil {
				continue
			}

			if status.MessageID == 0 {
				continue
			}

			readAt, err := store.MarkMessageRead(status.MessageID, userID)
			if err != nil {
				continue
			}

			msg, err := store.GetMessageByID(status.MessageID)
			if err != nil {
				continue
			}

			// notify reader
			_ = conn.WriteJSON(models.ChatEvent{
				Type: "message_status",
				Data: models.MessageStatusPayload{
					MessageID: status.MessageID,
					Status:    "read",
				},
			})

			// notify sender if online
			if senderConn, ok := chat.Manager.Get(msg.SenderID); ok {
				_ = senderConn.WriteJSON(models.ChatEvent{
					Type: "conversation_read",
					Data: models.ConversationReadPayload{
						UserID:     userID,
						MessageIDs: []int{status.MessageID},
						ReadAt:     readAt,
					},
				})
			}
		}
	}
}
