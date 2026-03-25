package ws

import (
	"log"
	"net/http"

	"github.com/Des1red/goauthlib/goauth"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func WS(w http.ResponseWriter, r *http.Request) {
	payload := goauth.FromContext(r.Context())
	if payload == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("ws upgrade error:", err)
		return
	}
	defer conn.Close()

	userID := payload.UserID
	registerConnection(userID, conn)
	defer unregisterConnection(userID, conn)

	for {
		var raw incomingEvent
		if err := conn.ReadJSON(&raw); err != nil {
			log.Println("ws read error:", err)
			return
		}

		handleEvent(userID, conn, raw)
	}
}
