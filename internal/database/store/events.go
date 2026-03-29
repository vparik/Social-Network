package store

import (
	"database/sql"
	"errors"
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

// CreateGroupEvent inserts a new event scoped to a group.
func CreateGroupEvent(groupID, userID int, title, content string, eventAt int64) (*models.Event, error) {
	result, err := database.DB.Exec(
		`INSERT INTO events (group_id, user_id, title, content, location, event_at)
		 VALUES (?, ?, ?, ?, '', ?)`,
		groupID, userID, title, content, eventAt,
	)
	if err != nil {
		return nil, err
	}

	eventID64, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetGroupEventByID(int(eventID64), userID)
}

// GetGroupEventByID returns a single group event with vote counts and the viewer's vote.
func GetGroupEventByID(eventID, viewerID int) (*models.Event, error) {
	e := &models.Event{}
	var myVote sql.NullString
	err := database.DB.QueryRow(
		`SELECT
			e.id, COALESCE(e.group_id, 0), e.user_id, e.title, e.content, e.location, e.event_at, e.created_at,
			(SELECT COUNT(*) FROM status WHERE event_id = e.id AND status = 'GOING') AS going_count,
			(SELECT COUNT(*) FROM status WHERE event_id = e.id AND status = 'NOT-GOING') AS not_going_count,
			(SELECT status FROM status WHERE event_id = e.id AND user_id = ?) AS my_vote
		 FROM events e
		 WHERE e.id = ?`,
		viewerID, eventID,
	).Scan(
		&e.ID, &e.GroupID, &e.UserID, &e.Title, &e.Content, &e.Location, &e.EventAt, &e.CreatedAt,
		&e.GoingCount, &e.NotGoingCount, &myVote,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("event_not_found")
	}
	e.MyVote = myVote.String
	return e, err
}

// GetGroupEvents returns all events for a group ordered by soonest first.
func GetGroupEvents(groupID, viewerID int) ([]*models.Event, error) {
	rows, err := database.DB.Query(
		`SELECT
			e.id, COALESCE(e.group_id, 0), e.user_id, e.title, e.content, e.location, e.event_at, e.created_at,
			(SELECT COUNT(*) FROM status WHERE event_id = e.id AND status = 'GOING') AS going_count,
			(SELECT COUNT(*) FROM status WHERE event_id = e.id AND status = 'NOT-GOING') AS not_going_count,
			(SELECT status FROM status WHERE event_id = e.id AND user_id = ?) AS my_vote
		 FROM events e
		 WHERE e.group_id = ?
		 ORDER BY e.event_at ASC`,
		viewerID, groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []*models.Event
	for rows.Next() {
		e := &models.Event{}
		var myVote sql.NullString
		if err := rows.Scan(
			&e.ID, &e.GroupID, &e.UserID, &e.Title, &e.Content, &e.Location, &e.EventAt, &e.CreatedAt,
			&e.GoingCount, &e.NotGoingCount, &myVote,
		); err != nil {
			return nil, err
		}
		e.MyVote = myVote.String
		events = append(events, e)
	}
	if events == nil {
		events = []*models.Event{}
	}
	return events, rows.Err()
}

// VoteOnGroupEvent sets or updates a user's vote on an event.
func VoteOnGroupEvent(eventID, userID int, option string) (*models.Event, error) {
	if option != "GOING" && option != "NOT-GOING" {
		return nil, errors.New("invalid_option")
	}
	_, err := database.DB.Exec(
		`INSERT INTO status (event_id, user_id, status)
		 VALUES (?, ?, ?)
		 ON CONFLICT(user_id, event_id) DO UPDATE SET status = excluded.status`,
		eventID, userID, option,
	)
	if err != nil {
		return nil, err
	}
	return GetGroupEventByID(eventID, userID)
}

// GetEvents returns all events ordered by soonest first.
func GetEvents() ([]*models.Event, error) {
	rows, err := database.DB.Query(
		`SELECT id, COALESCE(group_id, 0), user_id, title, content, location, event_at, created_at
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
		if err := rows.Scan(&e.ID, &e.GroupID, &e.UserID, &e.Title, &e.Content, &e.Location, &e.EventAt, &e.CreatedAt); err != nil {
			return nil, err
		}
		events = append(events, e)
	}
	return events, rows.Err()
}
