package main

import (
	"fmt"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("basaltpass.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	var tables []string
	db.Raw("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").Scan(&tables)

	fmt.Println("=== 所有数据库表 ===")
	for _, table := range tables {
		if table == "sqlite_sequence" {
			continue
		}
		fmt.Println(table)
	}

	fmt.Println("\n=== 租户RBAC相关的表 ===")
	for _, table := range tables {
		if len(table) >= 6 && table[:6] == "tenant" {
			fmt.Println("✓", table)
		}
	}
}
