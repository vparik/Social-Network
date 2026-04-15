package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/http/ws"
	"strconv"

	"github.com/Des1red/goauthlib/goauth"
)

// POST /api/groups/{id}/events
func CreateGroupEvent(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	var body struct {
		Title       string `json:"title"`
		Content     string `json:"content"`
		EventAt     int64  `json:"eventAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Title == "" || body.EventAt == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_body"}`))
		return
	}

	event, err := store.CreateGroupEvent(groupID, payload.UserID, body.Title, body.Content, body.EventAt)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	ws.NotifyGroupEventCreated(event)

	// Notify all members (except creator) about the new event
	memberIDs, err := store.GetGroupMemberIDs(groupID)
	if err == nil {
		entityID := groupID
		for _, memberID := range memberIDs {
			if memberID == payload.UserID {
				continue
			}
			if err := store.CreateNotification(memberID, payload.UserID, "group_event", &entityID); err == nil {
				if n, err := store.GetLatestNotification(memberID); err == nil {
					if unread, err := store.CountUnreadNotifications(memberID); err == nil {
						ws.NotifyNotificationCreated(memberID, n, unread)
					}
				}
			}
		}
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(event)
}

// GET /api/groups/{id}/events
func GetGroupEvents(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	events, err := store.GetGroupEvents(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(events)
}

// POST /api/groups/{id}/events/{eventID}/vote
func VoteOnGroupEvent(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	eventID, err := strconv.Atoi(r.PathValue("eventID"))
	if err != nil || eventID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_event_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	var body struct {
		Option string `json:"option"` // "GOING" | "NOT-GOING"
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Option == "" {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_body"}`))
		return
	}

	event, err := store.VoteOnGroupEvent(eventID, payload.UserID, body.Option)
	if err != nil {
		switch err.Error() {
		case "invalid_option":
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte(`{"error":"invalid_option"}`))
		default:
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(`{"error":"internal_error"}`))
		}
		return
	}

	ws.NotifyGroupEventVoteUpdated(event)

	json.NewEncoder(w).Encode(event)
}

// GET /api/groups/{id}/messages
func GetGroupMessages(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	payload := goauth.FromContext(r.Context())

	groupID, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || groupID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"error":"invalid_group_id"}`))
		return
	}

	isMember, err := store.IsGroupMember(groupID, payload.UserID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}
	if !isMember {
		w.WriteHeader(http.StatusForbidden)
		w.Write([]byte(`{"error":"forbidden"}`))
		return
	}

	messages, err := store.GetGroupMessages(groupID, 100)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"error":"internal_error"}`))
		return
	}

	json.NewEncoder(w).Encode(messages)
}
