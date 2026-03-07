package routes

import (
	"gorm.io/gorm"
)

// InitRouteDependencies 初始化 v1 路由层所需依赖
func InitRouteDependencies(db *gorm.DB) {
	InitPublicRouteDependencies(db)
	InitUserRouteDependencies(db)
	InitTenantRouteDependencies(db)
	InitAdminRouteDependencies(db)
}
