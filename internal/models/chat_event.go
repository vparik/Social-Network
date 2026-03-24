// Package models defines shared chat transport and persistence models.
//
// These types are used by both HTTP and websocket chat flows, including:
//   - websocket event envelopes
//   - chat message payloads
//   - message delivery/read receipt payloads
//   - user presence payloads
//
// The chat system uses a small event-based protocol where each websocket
// message contains a type and a data payload.
package models

type ChatEvent struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type SendMessagePayload struct {
	ReceiverID int    `json:"receiverId"`
	Content    string `json:"content"`
}

type MessageStatusPayload struct {
	MessageID int    `json:"messageId"`
	Status    string `json:"status"` // "received" or "read"
}

type ConversationReadPayload struct {
	UserID     int   `json:"userId"`
	MessageIDs []int `json:"messageIds"`
	ReadAt     int64 `json:"readAt"`
}

type PresencePayload struct {
	UserID int  `json:"userId"`
	Online bool `json:"online"`
}

type PresenceSnapshotPayload struct {
	UserIDs []int `json:"userIds"`
}
