package store

import (
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func CreateGroupMessage(groupID, userID int, content string) (*models.GroupMessage, error) {
	result, err := database.DB.Exec(
		`INSERT INTO group_messages (group_id, user_id, content) VALUES (?, ?, ?)`,
		groupID, userID, content,
	)
	if err != nil {
		return nil, err
	}

	msgID64, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	msg := &models.GroupMessage{}
	err = database.DB.QueryRow(
		`SELECT gm.id, gm.group_id, gm.user_id, gm.content, gm.sent_at,
		        u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_messages gm
		 JOIN users u ON u.id = gm.user_id
		 WHERE gm.id = ?`,
		msgID64,
	).Scan(
		&msg.ID, &msg.GroupID, &msg.UserID, &msg.Content, &msg.SentAt,
		&msg.FirstName, &msg.LastName, &msg.Nickname, &msg.AvatarPath,
	)
	return msg, err
}

func GetGroupMessages(groupID, limit int) ([]*models.GroupMessage, error) {
	if limit <= 0 {
		limit = 100
	}
	rows, err := database.DB.Query(
		`SELECT gm.id, gm.group_id, gm.user_id, gm.content, gm.sent_at,
		        u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_messages gm
		 JOIN users u ON u.id = gm.user_id
		 WHERE gm.group_id = ?
		 ORDER BY gm.sent_at ASC, gm.id ASC
		 LIMIT ?`,
		groupID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []*models.GroupMessage
	for rows.Next() {
		msg := &models.GroupMessage{}
		if err := rows.Scan(
			&msg.ID, &msg.GroupID, &msg.UserID, &msg.Content, &msg.SentAt,
			&msg.FirstName, &msg.LastName, &msg.Nickname, &msg.AvatarPath,
		); err != nil {
			return nil, err
		}
		messages = append(messages, msg)
	}
	if messages == nil {
		messages = []*models.GroupMessage{}
	}
	return messages, rows.Err()
}
