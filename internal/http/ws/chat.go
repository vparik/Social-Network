package ws

import (
	"encoding/json"
	"log"
	"socialnet/internal/database/store"
	"socialnet/internal/models"

	"github.com/gorilla/websocket"
)

func handleEvent(userID int, conn *websocket.Conn, raw incomingEvent) {
	switch raw.Type {
	case "send_message":
		handleSendMessage(userID, conn, raw.Data)
	case "mark_read":
		handleMarkRead(userID, conn, raw.Data)
	case "send_group_message":
		handleSendGroupMessage(userID, raw.Data)
	}
}

func handleSendGroupMessage(userID int, data json.RawMessage) {
	var req sendGroupMessageRequest
	if err := json.Unmarshal(data, &req); err != nil {
		return
	}
	if req.GroupID == 0 || req.Content == "" {
		return
	}

	isMember, err := store.IsGroupMember(req.GroupID, userID)
	if err != nil || !isMember {
		return
	}

	msg, err := store.CreateGroupMessage(req.GroupID, userID, req.Content)
	if err != nil {
		log.Println("CreateGroupMessage error:", err)
		return
	}

	memberIDs, err := store.GetGroupMemberIDs(req.GroupID)
	if err != nil {
		log.Println("GetGroupMemberIDs error:", err)
		return
	}

	Manager.SendToMany(memberIDs, models.ChatEvent{
		Type: "group_message",
		Data: msg,
	})
}

func handleSendMessage(userID int, conn *websocket.Conn, data json.RawMessage) {
	var msgReq models.SendMessagePayload
	if err := json.Unmarshal(data, &msgReq); err != nil {
		return
	}

	if msgReq.ReceiverID == 0 || msgReq.Content == "" {
		return
	}

	allowed, err := store.AreMutualFollows(userID, msgReq.ReceiverID)
	if err != nil {
		log.Println("AreMutualFollows error:", err)
		return
	}
	if !allowed {
		return
	}

	msg, err := store.CreateMessage(userID, msgReq.ReceiverID, msgReq.Content)
	if err != nil {
		return
	}

	_ = conn.WriteJSON(models.ChatEvent{
		Type: "message_sent",
		Data: msg,
	})

	if receiverConn, ok := Manager.Get(msgReq.ReceiverID); ok {
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
}

func handleMarkRead(userID int, conn *websocket.Conn, data json.RawMessage) {
	var status markReadRequest
	if err := json.Unmarshal(data, &status); err != nil {
		return
	}

	if status.MessageID == 0 {
		return
	}

	readAt, err := store.MarkMessageRead(status.MessageID, userID)
	if err != nil {
		return
	}

	msg, err := store.GetMessageByID(status.MessageID)
	if err != nil {
		return
	}

	_ = conn.WriteJSON(models.ChatEvent{
		Type: "message_status",
		Data: models.MessageStatusPayload{
			MessageID: status.MessageID,
			Status:    "read",
		},
	})

	NotifyConversationRead(msg.SenderID, userID, []int{status.MessageID}, readAt)
}

func NotifyConversationRead(userID, readerID int, messageIDs []int, readAt int64) {
	if len(messageIDs) == 0 {
		return
	}

	if conn, ok := Manager.Get(userID); ok {
		_ = conn.WriteJSON(models.ChatEvent{
			Type: "conversation_read",
			Data: models.ConversationReadPayload{
				UserID:     readerID,
				MessageIDs: messageIDs,
				ReadAt:     readAt,
			},
		})
	}
}
