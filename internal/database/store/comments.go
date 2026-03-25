package store

import (
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

// CreateComment inserts a new comment and returns the full comment row joined with user info.
// Called by the CreateComment handler (POST /api/posts/{id}/comments).
func CreateComment(postID, userID int, content string) (*models.Comment, error) {
	res, err := database.DB.Exec(
		`INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)`,
		postID, userID, content,
	)
	if err != nil {
		return nil, err
	}

	newID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	c := &models.Comment{}
	err = database.DB.QueryRow(
		`SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, COALESCE(u.nickname, '')
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.id = ?`,
		newID,
	).Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt, &c.FirstName, &c.LastName, &c.Nickname)
	if err != nil {
		return nil, err
	}

	return c, nil
}

// GetComments returns all comments for a given post, oldest first.
// Called by the GetComments handler (GET /api/posts/{id}/comments).
func GetComments(postID int) ([]*models.Comment, error) {
	rows, err := database.DB.Query(
		`SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.first_name, u.last_name, COALESCE(u.nickname, '')
		 FROM comments c
		 JOIN users u ON c.user_id = u.id
		 WHERE c.post_id = ?
		 ORDER BY c.created_at ASC`,
		postID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*models.Comment
	for rows.Next() {
		c := &models.Comment{}
		if err := rows.Scan(&c.ID, &c.PostID, &c.UserID, &c.Content, &c.CreatedAt, &c.FirstName, &c.LastName, &c.Nickname); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, nil
}

func DeleteComment(commentID, userID int) error {
	var ownerID int

	err := database.DB.QueryRow(
		`SELECT user_id FROM comments WHERE id = ?`,
		commentID,
	).Scan(&ownerID)
	if err != nil {
		return errors.New("comment_not_found")
	}

	if ownerID != userID {
		return errors.New("forbidden")
	}

	_, err = database.DB.Exec(
		`DELETE FROM comments WHERE id = ?`,
		commentID,
	)
	return err
}
