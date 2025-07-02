package common

import (
	"log"
	"sync"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	db   *gorm.DB
	once sync.Once
)

// DB returns a singleton *gorm.DB connected to a local SQLite database file.
func DB() *gorm.DB {
	once.Do(func() {
		var err error
		db, err = gorm.Open(sqlite.Open("basaltpass.db"), &gorm.Config{})
		if err != nil {
			log.Fatalf("failed to connect database: %v", err)
		}
	})
	return db
}
