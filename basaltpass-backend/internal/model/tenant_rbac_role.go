package model

import "time"

// TenantRole 租户角色模型
type TenantRbacRole struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Code        string    `json:"code" gorm:"uniqueIndex:idx_tenant_role_code;size:100;not null"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Description string    `json:"description" gorm:"size:500"`
	TenantID    uint      `json:"tenant_id" gorm:"uniqueIndex:idx_tenant_role_code;not null;index"`
	IsSystem    bool      `json:"is_system" gorm:"default:false"` // 是否为系统角色（不可删除）
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	Tenant      Tenant                 `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Permissions []TenantRbacPermission `gorm:"many2many:tenant_rbac_role_permissions;" json:"permissions,omitempty"`
	UserRoles   []TenantUserRbacRole   `gorm:"foreignKey:RoleID" json:"user_roles,omitempty"`
}

// TableName 设置表名
func (TenantRbacRole) TableName() string {
	return "tenant_rbac_roles"
}

// TenantUserRole 用户-租户角色关联
type TenantUserRbacRole struct {
	ID         uint       `json:"id" gorm:"primaryKey"`
	UserID     uint       `json:"user_id" gorm:"not null;index"`
	TenantID   uint       `json:"tenant_id" gorm:"not null;index"`
	RoleID     uint       `json:"role_id" gorm:"not null"`
	AssignedAt time.Time  `json:"assigned_at"`
	AssignedBy uint       `json:"assigned_by" gorm:"not null"`
	ExpiresAt  *time.Time `json:"expires_at,omitempty"`

	// 关联
	User           User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Tenant         Tenant         `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Role           TenantRbacRole `gorm:"foreignKey:RoleID" json:"role,omitempty"`
	AssignedByUser User           `gorm:"foreignKey:AssignedBy" json:"assigned_by_user,omitempty"`
}

// TableName 设置表名
func (TenantUserRbacRole) TableName() string {
	return "tenant_user_rbac_roles"
}
