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
