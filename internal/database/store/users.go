package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func CreateUser(email, passwordHash, role, firstName, lastName, dateOfBirth, avatarPath, nickname, aboutMe string) error {
	_, err := database.DB.Exec(
		`INSERT INTO users (email, password_hash, role, first_name, last_name, date_of_birth, avatar_path, nickname, about_me)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		email,
		passwordHash,
		role,
		firstName,
		lastName,
		dateOfBirth,
		avatarPath,
		nickname,
		aboutMe,
	)
	return err
}

func GetUserByEmail(email string) (*models.User, error) {
	row := database.DB.QueryRow(
		`SELECT id, email, password_hash, role
		 FROM users
		 WHERE email = ?`,
		email,
	)

	var u models.User
	var avatarPath, nickname, aboutMe sql.NullString // nullable fields

	err := row.Scan(
		&u.ID,
		&u.Email,
		&u.PasswordHash,
		&u.Role,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("user_not_found")
	}
	if err != nil {
		return nil, err
	}

	// unwrap nullable fields
	u.AvatarPath = avatarPath.String
	u.Nickname = nickname.String
	u.AboutMe = aboutMe.String

	return &u, nil
}

func GetUserByID(id int) (*models.User, error) {
	row := database.DB.QueryRow(
		`SELECT
			u.id, u.first_name, u.last_name, u.date_of_birth,
			u.avatar_path, u.nickname, u.about_me, u.is_public, u.created_at,
			(SELECT COUNT(*) FROM follows WHERE following_id = u.id) AS followers_count,
			(SELECT COUNT(*) FROM follows WHERE follower_id  = u.id) AS following_count
		 FROM users u
		 WHERE u.id = ?`,
		id,
	)

	var u models.User
	var avatarPath, nickname, aboutMe sql.NullString //nullables

	err := row.Scan(
		&u.ID,
		&u.FirstName,
		&u.LastName,
		&u.DateOfBirth,
		&avatarPath,
		&nickname,
		&aboutMe,
		&u.IsPublic,
		&u.CreatedAt,
		&u.FollowersCount,
		&u.FollowingCount,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("user_not_found")
	}
	if err != nil {
		return nil, err
	}

	u.AvatarPath = avatarPath.String
	u.Nickname = nickname.String
	u.AboutMe = aboutMe.String

	return &u, nil
}

// get all users except profile owner this is used for the chat conversations
// later we need to replace with get only followers
func GetAllUsersExcept(userID int) ([]models.User, error) {
	rows, err := database.DB.Query(
		`SELECT id, first_name, last_name, nickname
		 FROM users
		 WHERE id != ?
		 ORDER BY first_name ASC, last_name ASC, id ASC`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.User

	for rows.Next() {
		var u models.User
		var nickname sql.NullString

		if err := rows.Scan(
			&u.ID,
			&u.FirstName,
			&u.LastName,
			&nickname,
		); err != nil {
			return nil, err
		}

		u.Nickname = nickname.String
		users = append(users, u)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
