package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func Follow(followerID, followingID int) error {
	if followerID == followingID {
		return errors.New("cannot_follow_self")
	}

	_, err := database.DB.Exec(
		`INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
		followerID, followingID,
	)
	return err
}

func Unfollow(followerID, followingID int) error {
	_, err := database.DB.Exec(
		`DELETE FROM follows WHERE follower_id = ? AND following_id = ?`,
		followerID, followingID,
	)
	return err
}

func IsFollowing(followerID, followingID int) (bool, error) {
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ? LIMIT 1`,
		followerID, followingID,
	).Scan(&exists)

	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func CreateFollowRequest(requesterID, targetID int) error {
	if requesterID == targetID {
		return errors.New("cannot_follow_self")
	}

	_, err := database.DB.Exec(
		`INSERT OR IGNORE INTO follow_requests (requester_id, target_id) VALUES (?, ?)`,
		requesterID, targetID,
	)
	return err
}

func DeleteFollowRequest(requesterID, targetID int) error {
	_, err := database.DB.Exec(
		`DELETE FROM follow_requests WHERE requester_id = ? AND target_id = ?`,
		requesterID, targetID,
	)
	return err
}

func HasFollowRequest(requesterID, targetID int) (bool, error) {
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1
		 FROM follow_requests
		 WHERE requester_id = ? AND target_id = ?
		 LIMIT 1`,
		requesterID, targetID,
	).Scan(&exists)

	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func AcceptFollowRequest(requesterID, targetID int) error {
	tx, err := database.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var exists int
	err = tx.QueryRow(
		`SELECT 1
		 FROM follow_requests
		 WHERE requester_id = ? AND target_id = ?
		 LIMIT 1`,
		requesterID, targetID,
	).Scan(&exists)
	if errors.Is(err, sql.ErrNoRows) {
		return errors.New("follow_request_not_found")
	}
	if err != nil {
		return err
	}

	if _, err := tx.Exec(
		`DELETE FROM follow_requests
		 WHERE requester_id = ? AND target_id = ?`,
		requesterID, targetID,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)`,
		requesterID, targetID,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func GetFollowRequests(targetID int) ([]models.User, error) {
	rows, err := database.DB.Query(
		`SELECT u.id, u.first_name, u.last_name, u.nickname, u.avatar_path
		 FROM follow_requests fr
		 JOIN users u ON u.id = fr.requester_id
		 WHERE fr.target_id = ?
		 ORDER BY fr.created_at DESC`,
		targetID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanUserList(rows)
}

func scanUserList(rows *sql.Rows) ([]models.User, error) {
	var users []models.User
	for rows.Next() {
		var u models.User
		var nickname, avatarPath sql.NullString

		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &nickname, &avatarPath); err != nil {
			return nil, err
		}

		u.Nickname = nickname.String
		u.AvatarPath = avatarPath.String
		users = append(users, u)
	}

	if users == nil {
		users = []models.User{}
	}

	return users, rows.Err()
}

func GetFollowers(userID int) ([]models.User, error) {
	rows, err := database.DB.Query(
		`SELECT u.id, u.first_name, u.last_name, u.nickname, u.avatar_path
		 FROM follows f
		 JOIN users u ON u.id = f.follower_id
		 WHERE f.following_id = ?
		 ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanUserList(rows)
}

func GetFollowing(userID int) ([]models.User, error) {
	rows, err := database.DB.Query(
		`SELECT u.id, u.first_name, u.last_name, u.nickname, u.avatar_path
		 FROM follows f
		 JOIN users u ON u.id = f.following_id
		 WHERE f.follower_id = ?
		 ORDER BY f.created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanUserList(rows)
}

func GetMutualFollows(userID int) ([]models.User, error) {
	rows, err := database.DB.Query(
		`SELECT DISTINCT u.id, u.first_name, u.last_name, u.nickname, u.avatar_path
		 FROM follows f1
		 JOIN follows f2
		   ON f1.following_id = f2.follower_id
		  AND f1.follower_id = f2.following_id
		 JOIN users u
		   ON u.id = f1.following_id
		 WHERE f1.follower_id = ?
		 ORDER BY u.first_name ASC, u.last_name ASC, u.id ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanUserList(rows)
}

func AreMutualFollows(userA, userB int) (bool, error) {
	var exists int
	err := database.DB.QueryRow(
		`SELECT 1
		 FROM follows f1
		 JOIN follows f2
		   ON f1.following_id = f2.follower_id
		  AND f1.follower_id = f2.following_id
		 WHERE f1.follower_id = ?
		   AND f1.following_id = ?
		 LIMIT 1`,
		userA, userB,
	).Scan(&exists)

	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return err == nil, err
}

func GetAffectedRelationshipUserIDs(actorID, targetID int) ([]int, error) {
	unique := map[int]struct{}{
		actorID:  {},
		targetID: {},
	}

	collect := func(userID int) error {
		followers, err := GetFollowers(userID)
		if err != nil {
			return err
		}
		for _, u := range followers {
			unique[u.ID] = struct{}{}
		}

		following, err := GetFollowing(userID)
		if err != nil {
			return err
		}
		for _, u := range following {
			unique[u.ID] = struct{}{}
		}

		return nil
	}

	if err := collect(actorID); err != nil {
		return nil, err
	}
	if actorID != targetID {
		if err := collect(targetID); err != nil {
			return nil, err
		}
	}

	ids := make([]int, 0, len(unique))
	for id := range unique {
		ids = append(ids, id)
	}

	return ids, nil
}
