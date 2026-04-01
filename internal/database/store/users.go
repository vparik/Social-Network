package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/memory"
	"socialnet/internal/models"
)

func CreateUser(email, passwordHash, role, firstName, lastName, dateOfBirth, avatarPath, nickname, aboutMe string) error {
	result, err := database.DB.Exec(
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
	if err != nil {
		return err
	}

	id, err := result.LastInsertId()
	if err != nil {
		return err
	}

	memory.AddToUserMemory(int(id), firstName, lastName, nickname)

	return nil
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

func UpdateAvatarPath(userID int, path string) error {
	_, err := database.DB.Exec(
		`UPDATE users SET avatar_path = ? WHERE id = ?`,
		path,
		userID,
	)
	return err
}

func SetUserPrivacy(userID int, isPublic bool) error {
	value := 0
	if isPublic {
		value = 1
	}

	_, err := database.DB.Exec(
		`UPDATE users SET is_public = ? WHERE id = ?`,
		value,
		userID,
	)
	return err
}

func LoadAllUsers() ([]models.UserMemoryRow, error) {
	rows, err := database.DB.Query(
		`SELECT id, first_name, last_name, COALESCE(nickname, '')
		 FROM users
		 ORDER BY first_name ASC, last_name ASC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.UserMemoryRow

	for rows.Next() {
		var user models.UserMemoryRow

		if err := rows.Scan(&user.ID, &user.FirstName, &user.LastName, &user.Nickname); err != nil {
			return nil, err
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return users, nil
}
