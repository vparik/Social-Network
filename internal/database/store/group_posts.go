package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func CreateGroupPost(groupID, userID int, title, content, imageURL string) (*models.GroupPost, error) {
	result, err := database.DB.Exec(
		`INSERT INTO group_posts (group_id, user_id, title, content, image_url) VALUES (?, ?, ?, ?, NULLIF(?, ''))`,
		groupID, userID, title, content, imageURL,
	)
	if err != nil {
		return nil, err
	}

	postID64, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetGroupPostByID(int(postID64))
}

func GetGroupPostByID(postID int) (*models.GroupPost, error) {
	p := &models.GroupPost{}
	var imageURL sql.NullString
	err := database.DB.QueryRow(
		`SELECT gp.id, gp.group_id, gp.user_id, gp.title, gp.content, COALESCE(gp.image_url, ''),
		        gp.created_at, u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_posts gp
		 JOIN users u ON u.id = gp.user_id
		 WHERE gp.id = ?`,
		postID,
	).Scan(
		&p.ID, &p.GroupID, &p.UserID, &p.Title, &p.Content, &imageURL,
		&p.CreatedAt, &p.FirstName, &p.LastName, &p.Nickname, &p.AvatarPath,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("group_post_not_found")
	}
	p.ImageURL = imageURL.String
	return p, err
}

func GetGroupPosts(groupID int) ([]*models.GroupPost, error) {
	rows, err := database.DB.Query(
		`SELECT gp.id, gp.group_id, gp.user_id, gp.title, gp.content, COALESCE(gp.image_url, ''),
		        gp.created_at, u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_posts gp
		 JOIN users u ON u.id = gp.user_id
		 WHERE gp.group_id = ?
		 ORDER BY gp.created_at DESC`,
		groupID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var posts []*models.GroupPost
	for rows.Next() {
		p := &models.GroupPost{}
		var imageURL sql.NullString
		if err := rows.Scan(
			&p.ID, &p.GroupID, &p.UserID, &p.Title, &p.Content, &imageURL,
			&p.CreatedAt, &p.FirstName, &p.LastName, &p.Nickname, &p.AvatarPath,
		); err != nil {
			return nil, err
		}
		p.ImageURL = imageURL.String
		posts = append(posts, p)
	}
	if posts == nil {
		posts = []*models.GroupPost{}
	}
	return posts, rows.Err()
}

func DeleteGroupPost(postID, actorID int) error {
	var ownerID, groupID int
	err := database.DB.QueryRow(
		`SELECT user_id, group_id FROM group_posts WHERE id = ?`, postID,
	).Scan(&ownerID, &groupID)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("group_post_not_found")
	}
	if err != nil {
		return err
	}

	if ownerID != actorID {
		// Group owner can also delete
		isOwner, err := IsGroupOwner(groupID, actorID)
		if err != nil {
			return err
		}
		if !isOwner {
			return errors.New("forbidden")
		}
	}

	_, err = database.DB.Exec(`DELETE FROM group_posts WHERE id = ?`, postID)
	return err
}

// --- Group Comments ---

func CreateGroupComment(postID, userID int, content, imageURL string) (*models.GroupComment, error) {
	result, err := database.DB.Exec(
		`INSERT INTO group_comments (post_id, user_id, content, image_url) VALUES (?, ?, ?, NULLIF(?, ''))`,
		postID, userID, content, imageURL,
	)
	if err != nil {
		return nil, err
	}

	commentID64, err := result.LastInsertId()
	if err != nil {
		return nil, err
	}

	return GetGroupCommentByID(int(commentID64))
}

func GetGroupCommentByID(commentID int) (*models.GroupComment, error) {
	c := &models.GroupComment{}
	var imageURL sql.NullString
	err := database.DB.QueryRow(
		`SELECT gc.id, gc.post_id, gc.user_id, gc.content, COALESCE(gc.image_url, ''),
		        gc.created_at, u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_comments gc
		 JOIN users u ON u.id = gc.user_id
		 WHERE gc.id = ?`,
		commentID,
	).Scan(
		&c.ID, &c.PostID, &c.UserID, &c.Content, &imageURL,
		&c.CreatedAt, &c.FirstName, &c.LastName, &c.Nickname, &c.AvatarPath,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("group_comment_not_found")
	}
	c.ImageURL = imageURL.String
	return c, err
}

func GetGroupComments(postID int) ([]*models.GroupComment, error) {
	rows, err := database.DB.Query(
		`SELECT gc.id, gc.post_id, gc.user_id, gc.content, COALESCE(gc.image_url, ''),
		        gc.created_at, u.first_name, u.last_name, COALESCE(u.nickname, ''), COALESCE(u.avatar_path, '')
		 FROM group_comments gc
		 JOIN users u ON u.id = gc.user_id
		 WHERE gc.post_id = ?
		 ORDER BY gc.created_at ASC`,
		postID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*models.GroupComment
	for rows.Next() {
		c := &models.GroupComment{}
		var imageURL sql.NullString
		if err := rows.Scan(
			&c.ID, &c.PostID, &c.UserID, &c.Content, &imageURL,
			&c.CreatedAt, &c.FirstName, &c.LastName, &c.Nickname, &c.AvatarPath,
		); err != nil {
			return nil, err
		}
		c.ImageURL = imageURL.String
		comments = append(comments, c)
	}
	if comments == nil {
		comments = []*models.GroupComment{}
	}
	return comments, rows.Err()
}

func DeleteGroupComment(commentID, actorID int) error {
	var ownerID, postID int
	err := database.DB.QueryRow(
		`SELECT user_id, post_id FROM group_comments WHERE id = ?`, commentID,
	).Scan(&ownerID, &postID)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("group_comment_not_found")
	}
	if err != nil {
		return err
	}

	if ownerID != actorID {
		// Group owner can also delete
		var groupID int
		if err := database.DB.QueryRow(
			`SELECT group_id FROM group_posts WHERE id = ?`, postID,
		).Scan(&groupID); err != nil {
			return err
		}
		isOwner, err := IsGroupOwner(groupID, actorID)
		if err != nil {
			return err
		}
		if !isOwner {
			return errors.New("forbidden")
		}
	}

	_, err = database.DB.Exec(`DELETE FROM group_comments WHERE id = ?`, commentID)
	return err
}
