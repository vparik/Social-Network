package store

import (
	"socialnet/internal/database"
	"socialnet/internal/models"
)

// CreateEvent inserts a new event into the database.
// eventAt is a Unix timestamp representing the full date and time of the event.
func CreateEvent(userID int, title, content, location string, eventAt int64) error {
	_, err := database.DB.Exec(
		`INSERT INTO events (user_id, title, content, location, event_at)
		 VALUES (?, ?, ?, ?, ?)`,
		userID, title, content, location, eventAt,
	)
	return err
}

// GetEvents returns all events ordered by soonest first.
func GetEvents() ([]*models.Event, error) {
	rows, err := database.DB.Query(
		`SELECT id, user_id, title, content, location, event_at, created_at
		 FROM events
		 ORDER BY event_at ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*models.Event
	for rows.Next() {
		e := &models.Event{}
		if err := rows.Scan(&e.ID, &e.UserID, &e.Title, &e.Content, &e.Location, &e.EventAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}
