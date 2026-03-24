// Package store provides database access helpers for private chat messages.
//
// This file contains message persistence operations used by the chat system:
//   - create a new private message
//   - mark messages as delivered or read
//   - fetch a conversation between two users
//   - inspect unread messages for read receipt updates
//
// Message state model:
//   - sent_at: message creation time
//   - received_at: set when the recipient is online and delivery succeeds
//   - read_at: set when the recipient opens or actively reads the message
package store

import (
	"socialnet/internal/database"
	"socialnet/internal/models"
	"time"
)

func CreateMessage(senderID, receiverID int, content string) (*models.Message, error) {
	now := time.Now().Unix()

	res, err := database.DB.Exec(
		`INSERT INTO messages (sender_id, receiver_id, content, sent_at, received_at, read_at)
		 VALUES (?, ?, ?, ?, 0, 0)`,
		senderID,
		receiverID,
		content,
		now,
	)
	if err != nil {
		return nil, err
	}

	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	return &models.Message{
		ID:         int(id),
		SenderID:   senderID,
		ReceiverID: receiverID,
		Content:    content,
		SentAt:     now,
		ReceivedAt: 0,
		ReadAt:     0,
	}, nil
}

func MarkConversationRead(userID, otherUserID int) (int64, error) {
	now := time.Now().Unix()

	_, err := database.DB.Exec(
		`UPDATE messages
		 SET read_at = ?
		 WHERE sender_id = ?
		   AND receiver_id = ?
		   AND read_at = 0`,
		now,
		otherUserID,
		userID,
	)
	if err != nil {
		return 0, err
	}

	return now, nil
}

func MarkMessageReceived(messageID int) (int64, error) {
	now := time.Now().Unix()

	_, err := database.DB.Exec(
		`UPDATE messages
		 SET received_at = ?
		 WHERE id = ? AND received_at = 0`,
		now,
		messageID,
	)
	if err != nil {
		return 0, err
	}

	return now, nil
}

func MarkMessageRead(messageID int, userID int) (int64, error) {
	now := time.Now().Unix()

	_, err := database.DB.Exec(
		`UPDATE messages
		 SET read_at = ?
		 WHERE id = ? AND receiver_id = ? AND read_at = 0`,
		now,
		messageID,
		userID,
	)
	if err != nil {
		return 0, err
	}

	return now, nil
}

func GetConversation(userID, otherUserID int) ([]models.Message, error) {
	rows, err := database.DB.Query(
		`SELECT id, sender_id, receiver_id, content, sent_at, received_at, read_at
		 FROM messages
		 WHERE (sender_id = ? AND receiver_id = ?)
		    OR (sender_id = ? AND receiver_id = ?)
		 ORDER BY sent_at ASC, id ASC`,
		userID, otherUserID,
		otherUserID, userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []models.Message

	for rows.Next() {
		var m models.Message
		if err := rows.Scan(
			&m.ID,
			&m.SenderID,
			&m.ReceiverID,
			&m.Content,
			&m.SentAt,
			&m.ReceivedAt,
			&m.ReadAt,
		); err != nil {
			return nil, err
		}
		messages = append(messages, m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return messages, nil
}

func CountUnreadFromUser(receiverID, senderID int) (int, error) {
	row := database.DB.QueryRow(
		`SELECT COUNT(*)
		 FROM messages
		 WHERE receiver_id = ? AND sender_id = ? AND read_at = 0`,
		receiverID,
		senderID,
	)

	var count int
	if err := row.Scan(&count); err != nil {
		return 0, err
	}

	return count, nil
}

func GetUnreadMessageIDs(senderID, receiverID int) ([]int, error) {
	rows, err := database.DB.Query(
		`SELECT id
		 FROM messages
		 WHERE sender_id = ?
		   AND receiver_id = ?
		   AND read_at = 0
		 ORDER BY sent_at ASC, id ASC`,
		senderID,
		receiverID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return ids, nil
}

func GetMessageByID(messageID int) (*models.Message, error) {
	row := database.DB.QueryRow(
		`SELECT id, sender_id, receiver_id, content, sent_at, received_at, read_at
		 FROM messages
		 WHERE id = ?`,
		messageID,
	)

	var m models.Message
	err := row.Scan(
		&m.ID,
		&m.SenderID,
		&m.ReceiverID,
		&m.Content,
		&m.SentAt,
		&m.ReceivedAt,
		&m.ReadAt,
	)
	if err != nil {
		return nil, err
	}

	return &m, nil
}
