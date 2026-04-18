package model

import "time"

// TenantAuthSetting stores tenant-level auth switches.
type TenantAuthSetting struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	TenantID          uint      `gorm:"not null;uniqueIndex" json:"tenant_id"`
	AllowRegistration bool      `gorm:"not null;default:true" json:"allow_registration"`
	AllowLogin        bool      `gorm:"not null;default:true" json:"allow_login"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	Tenant Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
}

func (TenantAuthSetting) TableName() string {
	return "system_tenant_auth_settings"
}
