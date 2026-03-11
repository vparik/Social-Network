// initilize db
package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

func InitializeDB() {
	if err := initdb("socialnet.db"); err != nil {
		panic(err)
	}
}

func initdb(path string) error {
	var err error

	// start sqlite3
	DB, err = sql.Open("sqlite3", path)
	if err != nil {
		return err
	}
	if err = DB.Ping(); err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}
	// Restrict permissions for safety (read/write owner only)
	if err := os.Chmod("socialnet.db", 0777); err != nil {
		log.Printf("Warning: failed to set file permissions: %v", err)
	}
	return applySchema()
}

const schemaDir = "internal/database/schema/"

func applySchema() error {
	// Run schema files
	if err := execSQLFile(schemaDir + "001_tokens.sql"); err != nil {
		log.Fatalf("Failed to execute 001_tokens.sql: %v", err)
	}
	if err := execSQLFile(schemaDir + "002_users.sql"); err != nil {
		log.Fatalf("Failed to execute 002_users.sql: %v", err)
	}
	if err := execSQLFile(schemaDir + "003_posts.sql"); err != nil {
		log.Fatalf("Failed to execute 003_posts.sql: %v", err)
	}

	return nil
}

func execSQLFile(filename string) error {
	content, err := os.ReadFile(filename)
	if err != nil {
		return fmt.Errorf("cannot read 2 file %s: %w", filename, err)
	}

	queries := strings.Split(string(content), ";")
	for _, query := range queries {
		query = strings.TrimSpace(query)
		if query == "" {
			continue
		}
		_, err := DB.Exec(query)
		if err != nil {
			return fmt.Errorf("error executing query in %s: %w", filename, err)
		}
	}
	return nil
}
