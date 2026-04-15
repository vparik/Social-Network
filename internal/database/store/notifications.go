package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func CreateNotification(userID, actorID int, notifType string, entityID *int) error {
	_, err := database.DB.Exec(
		`INSERT INTO notifications (user_id, actor_id, type, entity_id)
		 VALUES (?, ?, ?, ?)`,
		userID, actorID, notifType, entityID,
	)
	return err
}

func GetLatestNotification(userID int) (*models.Notification, error) {
	row := database.DB.QueryRow(
		`SELECT
			n.id, n.user_id, n.actor_id, n.type, n.entity_id, n.is_read, n.created_at,
			u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, ''),
			c.post_id, COALESCE(g.title, '')
		 FROM notifications n
		 JOIN users u ON u.id = n.actor_id
		 LEFT JOIN comments c
		   ON n.type = 'comment' AND c.id = n.entity_id
		 LEFT JOIN groups g
		   ON n.type IN ('group_invite', 'group_join_request', 'group_join_accepted', 'group_event', 'group_comment')
		   AND g.id = n.entity_id
		 WHERE n.user_id = ?
		 ORDER BY n.created_at DESC, n.id DESC
		 LIMIT 1`,
		userID,
	)

	n := &models.Notification{}
	var entityID sql.NullInt64
	var postID sql.NullInt64
	var isReadInt int

	if err := row.Scan(
		&n.ID,
		&n.UserID,
		&n.ActorID,
		&n.Type,
		&entityID,
		&isReadInt,
		&n.CreatedAt,
		&n.FirstName,
		&n.LastName,
		&n.Nickname,
		&n.AvatarPath,
		&postID,
		&n.GroupName,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("notification_not_found")
		}
		return nil, err
	}

	n.IsRead = isReadInt == 1

	if entityID.Valid {
		v := int(entityID.Int64)
		n.EntityID = &v

		if n.Type == "comment" {
			commentID := v
			n.CommentID = &commentID
		}
	}

	if postID.Valid {
		v := int(postID.Int64)
		n.PostID = &v
	}

	return n, nil
}

func CountUnreadNotifications(userID int) (int, error) {
	var unreadCount int
	err := database.DB.QueryRow(
		`SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0`,
		userID,
	).Scan(&unreadCount)
	return unreadCount, err
}

func GetNotifications(userID int) ([]*models.Notification, int, error) {
	rows, err := database.DB.Query(
		`SELECT
			n.id, n.user_id, n.actor_id, n.type, n.entity_id, n.is_read, n.created_at,
			u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, ''),
			c.post_id, COALESCE(g.title, '')
		 FROM notifications n
		 JOIN users u ON u.id = n.actor_id
		 LEFT JOIN comments c
		   ON n.type = 'comment' AND c.id = n.entity_id
		 LEFT JOIN groups g
		   ON n.type IN ('group_invite', 'group_join_request', 'group_join_accepted', 'group_event', 'group_comment')
		   AND g.id = n.entity_id
		 WHERE n.user_id = ?
		 ORDER BY n.created_at DESC, n.id DESC
		 LIMIT 50`,
		userID,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var items []*models.Notification
	for rows.Next() {
		n := &models.Notification{}
		var entityID sql.NullInt64
		var postID sql.NullInt64
		var isReadInt int

		if err := rows.Scan(
			&n.ID,
			&n.UserID,
			&n.ActorID,
			&n.Type,
			&entityID,
			&isReadInt,
			&n.CreatedAt,
			&n.FirstName,
			&n.LastName,
			&n.Nickname,
			&n.AvatarPath,
			&postID,
			&n.GroupName,
		); err != nil {
			return nil, 0, err
		}

		n.IsRead = isReadInt == 1

		if entityID.Valid {
			v := int(entityID.Int64)
			n.EntityID = &v

			if n.Type == "comment" {
				commentID := v
				n.CommentID = &commentID
			}
		}

		if postID.Valid {
			v := int(postID.Int64)
			n.PostID = &v
		}

		items = append(items, n)
	}

	unreadCount, err := CountUnreadNotifications(userID)
	if err != nil {
		return nil, 0, err
	}

	if items == nil {
		items = []*models.Notification{}
	}

	return items, unreadCount, nil
}

func MarkAllNotificationsRead(userID int) error {
	_, err := database.DB.Exec(
		`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
		userID,
	)
	return err
}

func DeleteFollowRequestNotification(userID, actorID int) error {
	_, err := database.DB.Exec(
		`DELETE FROM notifications
		 WHERE user_id = ?
		   AND actor_id = ?
		   AND type = 'follow_request'`,
		userID,
		actorID,
	)
	return err
}

// DeleteGroupNotification removes a group-related notification by type and entity (group) ID.
// Pass actorID = 0 to match any actor (used for invite cleanup where actor may vary).
func DeleteGroupNotification(userID, actorID int, notifType string, groupID int) error {
	if actorID == 0 {
		_, err := database.DB.Exec(
			`DELETE FROM notifications WHERE user_id = ? AND type = ? AND entity_id = ?`,
			userID, notifType, groupID,
		)
		return err
	}
	_, err := database.DB.Exec(
		`DELETE FROM notifications WHERE user_id = ? AND actor_id = ? AND type = ? AND entity_id = ?`,
		userID, actorID, notifType, groupID,
	)
	return err
}
