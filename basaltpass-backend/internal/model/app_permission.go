package model

import (
	"time"
)

// AppPermission 应用权限模型
type AppPermission struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"uniqueIndex:idx_app_permission_code;size:100;not null"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Description string    `json:"description" gorm:"size:500"`
	Category    string    `json:"category" gorm:"size:50;not null"`
	AppID       uint      `json:"app_id" gorm:"uniqueIndex:idx_app_permission_code;not null"`
	TenantID    uint      `json:"tenant_id" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	App    App    `gorm:"foreignKey:AppID" json:"app,omitempty"`
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

// TableName 设置表名
func (AppPermission) TableName() string {
	return "app_permissions"
}

// AppRole 应用角色模型
type AppRole struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"uniqueIndex:idx_app_role_code;size:100;not null"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Description string    `json:"description" gorm:"size:500"`
	AppID       uint      `json:"app_id" gorm:"uniqueIndex:idx_app_role_code;not null"`
	TenantID    uint      `json:"tenant_id" gorm:"not null;index"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	App         App             `gorm:"foreignKey:AppID" json:"app,omitempty"`
	Tenant      Tenant          `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Permissions []AppPermission `gorm:"many2many:app_role_permissions;" json:"permissions,omitempty"`
	UserRoles   []AppUserRole   `gorm:"foreignKey:RoleID" json:"user_roles,omitempty"`
}

// TableName 设置表名
func (AppRole) TableName() string {
	return "app_roles"
}

// AppUserPermission 用户权限关联
type AppUserPermission struct {
	ID           uint       `json:"id" gorm:"primaryKey"`
	UserID       uint       `json:"user_id" gorm:"not null;index"`
	AppID        uint       `json:"app_id" gorm:"not null;index"`
	PermissionID uint       `json:"permission_id" gorm:"not null"`
	GrantedAt    time.Time  `json:"granted_at"`
	GrantedBy    uint       `json:"granted_by" gorm:"not null"`
	ExpiresAt    *time.Time `json:"expires_at,omitempty"`

	// 关联
	User          User          `gorm:"foreignKey:UserID" json:"user,omitempty"`
	App           App           `gorm:"foreignKey:AppID" json:"app,omitempty"`
	Permission    AppPermission `gorm:"foreignKey:PermissionID" json:"permission,omitempty"`
	GrantedByUser User          `gorm:"foreignKey:GrantedBy" json:"granted_by_user,omitempty"`
}

// TableName 设置表名
func (AppUserPermission) TableName() string {
	return "app_user_permissions"
}

// AppUserRole 用户角色关联
type AppUserRole struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	UserID     uint       `json:"user_id" gorm:"not null;index"`
	AppID      uint       `json:"app_id" gorm:"not null;index"`
	RoleID     uint       `json:"role_id" gorm:"not null"`
	AssignedAt time.Time  `json:"assigned_at"`
	AssignedBy uint       `json:"assigned_by" gorm:"not null"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`

	// 关联
	User           User    `gorm:"foreignKey:UserID" json:"user,omitempty"`
	App            App     `gorm:"foreignKey:AppID" json:"app,omitempty"`
	Role           AppRole `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	AssignedByUser User    `gorm:"foreignKey:AssignedBy" json:"assigned_by_user,omitempty"`
}

// TableName 设置表名
func (AppUserRole) TableName() string {
	return "app_user_roles"
}
