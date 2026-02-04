package main

import (
	"basaltpass-backend/internal/model"
	"log"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// 打开数据库
	db, err := gorm.Open(sqlite.Open("basaltpass.db"), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("开始迁移租户RBAC表...")

	// 迁移租户RBAC模型
	err = db.AutoMigrate(
		&model.TenantRbacPermission{},
		&model.TenantRbacRole{},
		&model.TenantUserRbacPermission{},
		&model.TenantUserRbacRole{},
		&model.TenantRbacRolePermission{},
	)
	if err != nil {
		log.Fatal("Migration failed:", err)
	}

	log.Println("✅ 租户RBAC表迁移完成!")

	// 验证表是否创建
	var tables []string
	db.Raw("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%tenant%rbac%' ORDER BY name").Scan(&tables)

	log.Println("\n创建的表:")
	for _, table := range tables {
		log.Println("  ✓", table)
	}
}
