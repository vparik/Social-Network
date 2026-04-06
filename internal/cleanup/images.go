package cleanup

import (
	"log"
	"os"
	"path/filepath"
	"socialnet/internal/database"
	"time"
)

const interval = 24 * time.Hour

// Start launches a background goroutine that deletes post image files on disk
// that are no longer referenced by any row in the posts table.
// It runs once immediately at startup, then every 24 hours.
func Start() {
	go func() {
		run()
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			run()
		}
	}()
}

func run() {
	deleted, err := sweepPostImages()
	if err != nil {
		log.Printf("image cleanup: error: %v", err)
		return
	}
	if deleted > 0 {
		log.Printf("image cleanup: deleted %d unreferenced post image(s)", deleted)
	}
}

// sweepPostImages deletes every file in ./uploads/posts/ whose name is not
// referenced in the database.
func sweepPostImages() (int, error) {
	// Collect every filename currently in use by a post.
	rows, err := database.DB.Query(
		`SELECT image_url FROM posts WHERE image_url IS NOT NULL AND image_url != ''`,
	)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	inUse := make(map[string]struct{})
	for rows.Next() {
		var url string
		if err := rows.Scan(&url); err != nil {
			return 0, err
		}
		// take only the filename
		inUse[filepath.Base(url)] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	// Walk ./uploads/posts/ and remove anything not in the in-use set.
	entries, err := os.ReadDir("./uploads/posts")
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}

	var deleted int
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		if _, referenced := inUse[entry.Name()]; !referenced {
			path := filepath.Join("./uploads/posts", entry.Name())
			if err := os.Remove(path); err != nil {
				log.Printf("image cleanup: failed to delete %s: %v", path, err)
				continue
			}
			deleted++
		}
	}

	return deleted, nil
}
