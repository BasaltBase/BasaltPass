package model

import "gorm.io/gorm"

// Role represents a role with permissions in the system
type Role struct {
	gorm.Model
	TenantID    uint   `gorm:"not null;index" json:"tenant_id"` // 租户ID
	AppID       *uint  `gorm:"index" json:"app_id,omitempty"`   // 应用ID（可选，NULL表示租户级角色）
	Code        string `gorm:"size:64;not null" json:"code"`    // 角色代码
	Name        string `gorm:"size:100;not null" json:"name"`   // 角色名称
	Description string `gorm:"size:500" json:"description"`     // 角色描述
	IsSystem    bool   `gorm:"default:false" json:"is_system"`  // 是否为系统角色（不可删除）

	// 关联
	Tenant      Tenant           `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	App         *App             `gorm:"foreignKey:AppID" json:"app,omitempty"`
	UserRoles   []UserRole       `gorm:"foreignKey:RoleID" json:"user_roles,omitempty"`
	Permissions []RolePermission `gorm:"foreignKey:RoleID" json:"role_permissions,omitempty"`
}

// TableName 设置表名
func (Role) TableName() string {
	return "roles"
}
