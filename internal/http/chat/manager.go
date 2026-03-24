// Package chat exposes the global in-memory chat hub.
//
// Manager is the shared hub instance used by chat handlers to:
//   - register websocket connections
//   - remove disconnected users
//   - look up online users
//   - broadcast presence changes
package chat

var Manager = NewHub()
