package model

import (
	"time"
)

// TenantInvitation 租户邀请记录
type TenantInvitation struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	TenantID  uint       `gorm:"not null;index" json:"tenant_id"`
	Email     string     `gorm:"size:255;not null;index" json:"email"`
	Role      TenantRole `gorm:"type:varchar(20);default:member" json:"role"`
	Status    string     `gorm:"size:20;default:pending" json:"status"` // pending, accepted, rejected, revoked
	InviterID uint       `gorm:"not null" json:"inviter_id"`
	Token     string     `gorm:"size:128;uniqueIndex" json:"token"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// 关联
	Tenant  Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	Inviter User   `gorm:"foreignKey:InviterID" json:"inviter,omitempty"`
}

// TableName 设置表名
func (TenantInvitation) TableName() string {
	return "tenant_invitations"
}
