package model

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"
)

// TenantStatus 租户状态
type TenantStatus string

const (
	TenantStatusActive    TenantStatus = "active"
	TenantStatusSuspended TenantStatus = "suspended"
	TenantStatusDeleted   TenantStatus = "deleted"
)

// TenantPlan 租户套餐类型
type TenantPlan string

const (
	TenantPlanFree       TenantPlan = "free"
	TenantPlanPro        TenantPlan = "pro"
	TenantPlanEnterprise TenantPlan = "enterprise"
)

// Tenant 租户模型
type Tenant struct {
	ID          uint         `gorm:"primaryKey" json:"id"`
	Name        string       `gorm:"size:128;not null" json:"name"`
	Code        string       `gorm:"size:64;uniqueIndex;not null" json:"code"`
	Description string       `gorm:"size:500" json:"description"`
	Status      TenantStatus `gorm:"type:varchar(20);default:active" json:"status"`
	Plan        TenantPlan   `gorm:"type:varchar(20);default:free" json:"plan"`
	Metadata    JSONMap      `gorm:"type:jsonb" json:"metadata,omitempty"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`

	// 关联
	TenantAdmins []TenantAdmin `gorm:"foreignKey:TenantID" json:"tenant_admins,omitempty"`
	Apps         []App         `gorm:"foreignKey:TenantID" json:"apps,omitempty"`
	Roles        []Role        `gorm:"foreignKey:TenantID" json:"roles,omitempty"`
}

// TenantRole 租户角色类型
type TenantRole string

const (
	TenantRoleOwner  TenantRole = "owner"
	TenantRoleAdmin  TenantRole = "tenant"
	TenantRoleMember TenantRole = "member"
)

// TenantAdmin 租户管理员关联模型（原UserTenant重命名）
type TenantAdmin struct {
	ID       uint       `gorm:"primaryKey" json:"id"`
	UserID   uint       `gorm:"not null;index" json:"user_id"`
	TenantID uint       `gorm:"not null;index" json:"tenant_id"`
	Role     TenantRole `gorm:"type:varchar(20);default:member" json:"role"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联
	User   User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

// TableName 设置表名
func (TenantAdmin) TableName() string {
	return "tenant_admins"
}

// AppUser 应用用户关联模型 - 记录用户对应用的授权信息
type AppUser struct {
	ID     uint `gorm:"primaryKey" json:"id"`
	AppID  uint `gorm:"not null;index" json:"app_id"`
	UserID uint `gorm:"not null;index" json:"user_id"`

	// 授权信息
	FirstAuthorizedAt time.Time  `gorm:"not null" json:"first_authorized_at"` // 首次授权时间
	LastAuthorizedAt  time.Time  `gorm:"not null" json:"last_authorized_at"`  // 最后授权时间
	LastActiveAt      *time.Time `json:"last_active_at,omitempty"`            // 最后活跃时间

	// 权限范围（可选）
	Scopes string `gorm:"size:500" json:"scopes,omitempty"` // 授权的权限范围

	// 用户状态控制（租户级别）
	Status         AppUserStatus `gorm:"type:varchar(20);default:active" json:"status"` // 用户在该应用中的状态
	BanReason      string        `gorm:"size:500" json:"ban_reason,omitempty"`          // 封禁原因
	BannedAt       *time.Time    `json:"banned_at,omitempty"`                           // 封禁时间
	BannedByUserID *uint         `json:"banned_by_user_id,omitempty"`                   // 执行封禁的管理员ID
	BannedUntil    *time.Time    `json:"banned_until,omitempty"`                        // 封禁截止时间（可选，空表示永久）

	// 元数据
	Metadata JSONMap `gorm:"type:jsonb" json:"metadata,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联
	App      App  `gorm:"foreignKey:AppID" json:"app,omitempty"`
	User     User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	BannedBy User `gorm:"foreignKey:BannedByUserID" json:"banned_by,omitempty"`
}

// TableName 设置表名
func (AppUser) TableName() string {
	return "app_users"
}

// App 应用模型（原OAuthClient的扩展）
type App struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TenantID    uint      `gorm:"not null;index" json:"tenant_id"`
	Name        string    `gorm:"size:128;not null" json:"name"`
	Description string    `gorm:"size:500" json:"description"`
	IconURL     string    `gorm:"size:255" json:"icon_url"`
	Status      AppStatus `gorm:"type:varchar(20);default:active" json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联
	Tenant       Tenant        `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	OAuthClients []OAuthClient `gorm:"foreignKey:AppID" json:"oauth_clients,omitempty"`
	AppUsers     []AppUser     `gorm:"foreignKey:AppID" json:"app_users,omitempty"`
}

// AppStatus 应用状态
type AppStatus string

const (
	AppStatusActive    AppStatus = "active"
	AppStatusSuspended AppStatus = "suspended"
	AppStatusDeleted   AppStatus = "deleted"
)

// AppUserStatus 应用用户状态
type AppUserStatus string

const (
	AppUserStatusActive     AppUserStatus = "active"     // 正常状态
	AppUserStatusBanned     AppUserStatus = "banned"     // 永久封禁
	AppUserStatusSuspended  AppUserStatus = "suspended"  // 临时封禁
	AppUserStatusRestricted AppUserStatus = "restricted" // 受限制（功能受限但可以使用）
)

// JSONMap 自定义JSON字段类型
type JSONMap map[string]interface{}

// Value 实现driver.Valuer接口
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan 实现sql.Scanner接口
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}

	var bytes []byte
	switch v := value.(type) {
	case []byte:
		bytes = v
	case string:
		bytes = []byte(v)
	default:
		return fmt.Errorf("cannot scan %T into JSONMap", value)
	}

	return json.Unmarshal(bytes, j)
}

// TODO ⬇️ 添加租户配额限制
type TenantQuota struct {
	ID               uint `gorm:"primaryKey" json:"id"`
	TenantID         uint `gorm:"not null;uniqueIndex" json:"tenant_id"`
	MaxApps          int  `gorm:"default:5" json:"max_apps"`               // 最大应用数量
	MaxUsers         int  `gorm:"default:100" json:"max_users"`            // 最大用户数量
	MaxTokensPerHour int  `gorm:"default:1000" json:"max_tokens_per_hour"` // 每小时最大令牌数

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联
	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}
