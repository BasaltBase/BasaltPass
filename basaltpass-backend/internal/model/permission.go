package model

import "gorm.io/gorm"

// Permission represents a global/system permission code
// 全局权限：用于系统级管理员权限管理
// 不再用于租户级或应用级权限（这些已有独立的 TenantPermission 和 AppPermission）
type Permission struct {
	gorm.Model
	Code string `gorm:"uniqueIndex;size:64"`
	Desc string `gorm:"size:255"`
}

// RolePermission pivot for global roles and permissions
type RolePermission struct {
	RoleID       uint `gorm:"primaryKey"`
	PermissionID uint `gorm:"primaryKey"`
}
