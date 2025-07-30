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
func DB() *gorm.DB {
	once.Do(func() {
		var err error
		// 获取当前工作目录
		wd, err := os.Getwd()
		if err != nil {
			log.Fatalf("failed to get working directory: %v", err)
		}

		// 确保数据库文件在 basaltpass-backend 目录下
		dbPath := filepath.Join(wd, "basaltpass.db")
		log.Printf("Database path: %s", dbPath)

		db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			log.Fatalf("failed to connect database: %v", err)
		}
	})
	return db
}
