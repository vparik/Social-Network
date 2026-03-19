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
func CreatePost(user_id int, title, content, privacy string) error {
	_, err := database.DB.Exec(
		`INSERT INTO posts (user_id, title, content, privacy)
		 VALUES (?, ?, ?, ?)`,
		user_id,
		title,
		content,
		privacy,
	)
	return err
}

// GetPosts returns all public posts ordered by newest first.
// Called by the GetPosts handler (GET /api/posts) to feed the home page.
//
// TODO: once the follow system is built, extend this to also return:
//   - "selected" posts where the requesting user follows the creator
//   - "private" posts where the requesting user is in the creator's chosen-followers list
func GetPosts() ([]*models.Post, error) {
	rows, err := database.DB.Query(
		`SELECT p.id, p.user_id, p.title, p.content, p.privacy, p.created_at, u.first_name, u.last_name, COALESCE(u.nickname, '')
		 FROM posts p
		 JOIN users u ON p.user_id = u.id
		 WHERE p.privacy = 'public'
		 ORDER BY p.created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.Post
	for rows.Next() {
		p := &models.Post{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.Privacy, &p.CreatedAt, &p.FirstName, &p.LastName, &p.Nickname); err != nil {
			return nil, err
		}
		posts = append(posts, p)
	}
	return posts, nil
}

// GetPrivacy returns the default privacy setting of a user based on their is_public flag.
// Used as a fallback if no privacy is specified when creating a post.
func GetPrivacy(userID int) string {
	var isPublic int
	err := database.DB.QueryRow("SELECT is_public FROM users WHERE id=$1", userID).Scan(&isPublic)
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
