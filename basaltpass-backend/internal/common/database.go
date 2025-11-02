package common

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"

	"basaltpass-backend/internal/config"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var (
	db   *gorm.DB
	once sync.Once
)

// DB returns a singleton *gorm.DB connected using configured driver.
// Keep this package decoupled from internal/model to avoid import cycles.
func DB() *gorm.DB {
	once.Do(func() {
		var err error

		cfg := config.Get()
		driver := cfg.Database.Driver

		switch driver {
		case "sqlite", "sqlite3", "":
			// Prefer DSN when provided; else build from path relative to CWD
			dsn := cfg.Database.DSN
			if dsn == "" {
				wd, err := os.Getwd()
				if err != nil {
					log.Fatalf("failed to get working directory: %v", err)
				}
				dbPath := cfg.Database.Path
				if dbPath == "" {
					dbPath = "basaltpass.db"
				}
				dsn = filepath.Join(wd, dbPath)
			}
			log.Printf("Database (sqlite) DSN: %s", dsn)
			db, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{})
		default:
			err = fmt.Errorf("unsupported database driver: %s", driver)
		}

		if err != nil {
			log.Fatalf("failed to connect database: %v", err)
		}
	})
	return db
}

// SetDBForTest injects a custom database connection for tests.
func SetDBForTest(testDB *gorm.DB) {
	db = testDB
	once = sync.Once{}
	once.Do(func() {})
	db = testDB
}
