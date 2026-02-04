package model

import "gorm.io/gorm"

// Role represents a global/system role with permissions
// 全局角色：用于系统级管理员权限管理
// 不再用于租户级或应用级角色（这些已有独立的 TenantRole 和 AppRole）
type Role struct {
	gorm.Model
	Code        string `gorm:"size:64;not null;uniqueIndex" json:"code"` // 角色代码
	Name        string `gorm:"size:100;not null" json:"name"`            // 角色名称
	Description string `gorm:"size:500" json:"description"`              // 角色描述
	IsSystem    bool   `gorm:"default:false" json:"is_system"`           // 是否为系统角色（不可删除）

	// 关联
	UserRoles   []UserRole       `gorm:"foreignKey:RoleID" json:"user_roles,omitempty"`
	Permissions []RolePermission `gorm:"foreignKey:RoleID" json:"role_permissions,omitempty"`
}

// TableName 设置表名
func (Role) TableName() string {
	return "roles"
}
