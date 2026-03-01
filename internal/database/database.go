// initilize db
package database

import (
	"database/sql"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func Init(path string) error {
	var err error

	// start sqlite3
	DB, err = sql.Open("sqlite3", path)
	if err != nil {
		return err
	}

	return applySchema()
}

func applySchema() error {
	// read shema
	content, err := os.ReadFile("internal/database/schema/001_init.sql")
	if err != nil {
		return err
	}

	// execute shema
	_, err = DB.Exec(string(content))
	return err
}
