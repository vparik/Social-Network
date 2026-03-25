package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

// CreatePost inserts a new post into the database.
// Called by the CreatePost handler (POST /api/posts).
// privacy must be one of: "public", "selected", "private"
// CreatePost inserts a new post into the database and returns the full created post.
func CreatePost(userID int, title, content, privacy string) (*models.Post, error) {
	result, err := database.DB.Exec(
		`INSERT INTO posts (user_id, title, content, privacy)
		 VALUES (?, ?, ?, ?)`,
		userID,
		title,
		content,
		privacy,
	)
	if err != nil {
		return nil, err
	}

	postID64, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetPostByID(int(postID64))
}

func GetPostByID(postID int) (*models.Post, error) {
	row := database.DB.QueryRow(
		`SELECT p.id, p.user_id, p.title, p.content, p.privacy, p.created_at,
		        u.first_name, u.last_name, COALESCE(u.nickname, '')
		 FROM posts p
		 JOIN users u ON p.user_id = u.id
		 WHERE p.id = ?`,
		postID,
	)

	p := &models.Post{}
	if err := row.Scan(
		&p.ID,
		&p.UserID,
		&p.Title,
		&p.Content,
		&p.Privacy,
		&p.CreatedAt,
		&p.FirstName,
		&p.LastName,
		&p.Nickname,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errors.New("post_not_found")
		}
		return nil, err
	}

	return p, nil
}

// GetPosts returns all public posts ordered by newest first.
// Called by the GetPosts handler (GET /api/posts) to feed the home page.
//
// TODO: once the follow system is built, extend this to also return:
//   - "selected" posts where the requesting user follows the creator
//   - "private" posts where the requesting user is in the creator's chosen-followers list
func GetPosts(viewerID int) ([]*models.Post, error) {
	rows, err := database.DB.Query(
		`SELECT p.id, p.user_id, p.title, p.content, p.privacy, p.created_at,
		        u.first_name, u.last_name, COALESCE(u.nickname, '')
		 FROM posts p
		 JOIN users u ON p.user_id = u.id
		 WHERE
		   p.user_id = ?
		   OR (
		     (
		       u.is_public = 1
		       OR EXISTS (
		         SELECT 1
		         FROM follows f
		         WHERE f.follower_id = ?
		           AND f.following_id = p.user_id
		       )
		     )
		     AND (
		       p.privacy = 'public'
		       OR (
		         p.privacy = 'selected'
		         AND EXISTS (
		           SELECT 1
		           FROM follows f2
		           WHERE f2.follower_id = ?
		             AND f2.following_id = p.user_id
		         )
		       )
		     )
		   )
		 ORDER BY p.created_at DESC`,
		viewerID,
		viewerID,
		viewerID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.Post
	for rows.Next() {
		p := &models.Post{}
		if err := rows.Scan(
			&p.ID,
			&p.UserID,
			&p.Title,
			&p.Content,
			&p.Privacy,
			&p.CreatedAt,
			&p.FirstName,
			&p.LastName,
			&p.Nickname,
		); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return posts, nil
}

// GetPrivacy returns the default privacy setting of a user based on their is_public flag.
// Used as a fallback if no privacy is specified when creating a post.
func GetPrivacy(userID int) string {
	var isPublic int
	err := database.DB.QueryRow("SELECT is_public FROM users WHERE id = ?", userID).Scan(&isPublic)
	if err != nil {
		return ""
	}
	if isPublic == 1 {
		return "public"
	}
	return "private"
}

// delete post from the creator
func DeletePost(postID int, userID int) error {
	var ownerID int
	err := database.DB.QueryRow(
		`SELECT user_id FROM posts WHERE id = ?`,
		postID,
	).Scan(&ownerID)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return errors.New("post_not_found")
		}
		return err
	}

	if ownerID != userID {
		return errors.New("forbidden")
	}

	_, err = database.DB.Exec(`DELETE FROM comments WHERE post_id = ?`, postID)
	if err != nil {
		return err
	}

	_, err = database.DB.Exec(`DELETE FROM posts WHERE id = ?`, postID)
	return err
}
