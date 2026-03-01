package store

import (
	"database/sql"
	"errors"
	"socialnet/internal/database"
)

type User struct {
	ID           int
	Username     string
	PasswordHash string
	Role         string
}

func CreateUser(username, passwordHash, role string) error {
	_, err := database.DB.Exec(
		`INSERT INTO users(username, password_hash, role)
		 VALUES(?, ?, ?)`,
		username,
		passwordHash,
		role,
	)

	return err
}

func GetUserByUsername(username string) (*User, error) {
	row := database.DB.QueryRow(
		`SELECT id, username, password_hash, role
		 FROM users
		 WHERE username = ?`,
		username,
	)

	var u User
	err := row.Scan(
		&u.ID,
		&u.Username,
		&u.PasswordHash,
		&u.Role,
	)

	if err == sql.ErrNoRows {
		return nil, errors.New("user_not_found")
	}
	if err != nil {
		return nil, err
	}

	return &u, nil
}
