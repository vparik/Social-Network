package store

import "socialnet/internal/database"

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
