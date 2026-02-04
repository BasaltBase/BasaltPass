package model

import (
	"time"
)

// TenantRbacPermission 租户权限模型
type TenantRbacPermission struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"uniqueIndex:idx_tenant_permission_code;size:100;not null"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Description string    `json:"description" gorm:"size:500"`
	Category    string    `json:"category" gorm:"size:50;not null"`
	TenantID    uint      `json:"tenant_id" gorm:"uniqueIndex:idx_tenant_permission_code;not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

// TableName 设置表名
func (TenantRbacPermission) TableName() string {
	return "tenant_rbac_permissions"
}

// TenantUserRbacPermission 用户-租户权限关联
type TenantUserRbacPermission struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	UserID       uint       `json:"user_id" gorm:"not null;index"`
	TenantID     uint       `json:"tenant_id" gorm:"not null;index"`
	PermissionID uint       `json:"permission_id" gorm:"not null"`
	GrantedAt    time.Time  `json:"granted_at"`
	GrantedBy    uint       `json:"granted_by" gorm:"not null"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`

	// 关联
	User          User             `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Tenant        Tenant           `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Permission    TenantRbacPermission `gorm:"foreignKey:PermissionID" json:"permission,omitempty"`
	GrantedByUser User             `gorm:"foreignKey:GrantedBy" json:"granted_by_user,omitempty"`
}

// TableName 设置表名
func (TenantUserRbacPermission) TableName() string {
	return "tenant_user_rbac_permissions"
}

// TenantRbacRolePermission 租户角色-权限关联
type TenantRbacRolePermission struct {
	RoleID       uint `gorm:"primaryKey"`
	PermissionID uint `gorm:"primaryKey"`
}

// TableName 设置表名
func (TenantRbacRolePermission) TableName() string {
	return "tenant_rbac_role_permissions"
}
