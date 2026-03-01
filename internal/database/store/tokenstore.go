package store

import (
	"database/sql"
	"socialnet/internal/database"
)

type AuthTokenStore struct{}

func NewAuthTokenStore() *AuthTokenStore {
	return &AuthTokenStore{}
}

func (s *AuthTokenStore) SaveToken(uuid, jti, tokenType string, exp int64) error {
	_, err := database.DB.Exec(
		`INSERT INTO tokens(uuid, jti, token_type, expires_at)
		 VALUES(?, ?, ?, ?)`,
		uuid, jti, tokenType, exp,
	)
	return err
}

func (s *AuthTokenStore) DeleteToken(jti string) error {
	_, err := database.DB.Exec(`DELETE FROM tokens WHERE jti = ?`, jti)
	return err
}

func (s *AuthTokenStore) TokenExists(jti string) (bool, error) {
	var exists string

	err := database.DB.QueryRow(
		`SELECT jti FROM tokens WHERE jti = ? LIMIT 1`,
		jti,
	).Scan(&exists)

	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	return true, nil
}
