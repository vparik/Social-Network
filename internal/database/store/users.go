package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
	"socialnet/internal/models"
)

func CreateUser(email, passwordHash, firstName, lastName, dateOfBirth, avatarPath, nickname, aboutMe string) error {
	_, err := database.DB.Exec(
		`INSERT INTO users (email, password_hash, first_name, last_name, date_of_birth, avatar_path, nickname, about_me)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		email,
		passwordHash,
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
		`SELECT id, email, password_hash, first_name, last_name, date_of_birth, avatar_path, nickname, about_me, is_public, created_at
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
		&u.FirstName,
		&u.LastName,
		&u.DateOfBirth,
		&avatarPath,
		&nickname,
		&aboutMe,
		&u.IsPublic,
		&u.CreatedAt,
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
