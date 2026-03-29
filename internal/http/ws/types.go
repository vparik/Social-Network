package ws

import "encoding/json"

type incomingEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type markReadRequest struct {
	MessageID int `json:"messageId"`
}

type sendGroupMessageRequest struct {
	GroupID int    `json:"groupId"`
	Content string `json:"content"`
}
