package common

import (
	"log"
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
		// 使用绝对路径确保数据库文件总是在项目根目录
		dbPath := filepath.Join("..", "..", "basaltpass.db")
		db, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
		if err != nil {
			log.Fatalf("failed to connect database: %v", err)
		}
	})
	return db
}
