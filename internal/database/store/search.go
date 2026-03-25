package store

import (
	"socialnet/internal/database"
	"socialnet/internal/models"
	"strings"
)

func SearchUsers(query string, excludeUserID int) ([]*models.User, error) {
	query = strings.TrimSpace(query)
	if query == "" {
		return []*models.User{}, nil
	}

	like := "%" + strings.ToLower(query) + "%"

	rows, err := database.DB.Query(
		`SELECT id, first_name, last_name, COALESCE(nickname, '')
		 FROM users
		 WHERE id != ?
		   AND (
		     LOWER(first_name) LIKE ?
		     OR LOWER(last_name) LIKE ?
		     OR LOWER(COALESCE(nickname, '')) LIKE ?
		     OR LOWER(first_name || ' ' || last_name) LIKE ?
		   )
		 ORDER BY first_name ASC, last_name ASC
		 LIMIT 20`,
		excludeUserID,
		like,
		like,
		like,
		like,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*models.User
	for rows.Next() {
		u := &models.User{}
		if err := rows.Scan(&u.ID, &u.FirstName, &u.LastName, &u.Nickname); err != nil {
			return nil, err
		}
		users = append(users, u)
	}

	return users, nil
}
