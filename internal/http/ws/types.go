package ws

import "encoding/json"

type incomingEvent struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

type markReadRequest struct {
	MessageID int `json:"messageId"`
}
