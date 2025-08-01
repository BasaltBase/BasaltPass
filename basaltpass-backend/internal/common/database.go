package common

import (
	"log"
	"os"
	"path/filepath"
	"sync"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	db   *gorm.DB
	once sync.Once
)

// DB returns a singleton *gorm.DB connected to a local SQLite database file.
// Ensure that this package does NOT import anything from internal/model.
// If you need shared types, move them to a new package, e.g., internal/types.
func DB() *gorm.DB {
	once.Do(func() {
		var err error
		wd, err := os.Getwd()
		if err != nil {
			log.Fatalf("failed to get working directory: %v", err)
		}

		dbPath := filepath.Join(wd, "basaltpass.db")
		log.Printf("Database path: %s", dbPath)

		db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			log.Fatalf("failed to connect database: %v", err)
		}
	})
	return db
}
