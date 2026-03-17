package handlers

import (
	"encoding/json"
	"net/http"
	"socialnet/internal/database/store"
	"socialnet/internal/models"

	"github.com/Des1red/goauthlib/goauth"
)

// CreateEvent handles POST /api/events.
// Expects a JSON body: { "title": "", "content": "", "location": "", "eventAt": 0 }
// eventAt is a Unix timestamp representing the full date and time of the event.
func CreateEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	payload := goauth.FromContext(r.Context())
	userID := payload.UserID

	var body struct {
		Title    string `json:"title"`
		Content  string `json:"content"`
		Location string `json:"location"`
		EventAt  int64  `json:"eventAt"`
	}

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if body.Title == "" {
		http.Error(w, "title is required", http.StatusBadRequest)
		return
	}
	if body.Content == "" {
		http.Error(w, "content is required", http.StatusBadRequest)
		return
	}
	if body.Location == "" {
		http.Error(w, "location is required", http.StatusBadRequest)
		return
	}
	if body.EventAt == 0 {
		http.Error(w, "eventAt is required", http.StatusBadRequest)
		return
	}

	if err := store.CreateEvent(userID, body.Title, body.Content, body.Location, body.EventAt); err != nil {
		http.Error(w, "failed to create event", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]any{
		"user_id":  userID,
		"title":    body.Title,
		"content":  body.Content,
		"location": body.Location,
		"eventAt":  body.EventAt,
	})
}

// GetEvents handles GET /api/events.
// Returns all events ordered by soonest first.
func GetEvents(w http.ResponseWriter, r *http.Request) {
	events, err := store.GetEvents()
	if err != nil {
		http.Error(w, "failed to fetch events", http.StatusInternalServerError)
		return
	}

	if events == nil {
		events = []*models.Event{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}
