package model

import "time"

// UserTenantTOTP 存储用户在特定租户下的 TOTP (时间型一次性密码) 配置。
// 同一用户在不同租户下可以拥有完全独立的 TOTP 密钥和启用状态，
// 租户之间互不可见、互不影响。
// TenantID = 0 表示系统/平台级别。
// 复合唯一索引 (user_id, tenant_id) 确保每个用户在每个租户下最多一条记录。
type UserTenantTOTP struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"not null;index" json:"user_id"`
	TenantID  uint       `gorm:"not null;index;default:0" json:"tenant_id"`
	Secret    string     `gorm:"size:64;not null" json:"secret"`
	Enabled   bool       `gorm:"default:false" json:"enabled"`
	EnabledAt *time.Time `json:"enabled_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`

	User User `gorm:"foreignKey:UserID"`
}

func (UserTenantTOTP) TableName() string {
	return "system_user_tenant_totps"
}
