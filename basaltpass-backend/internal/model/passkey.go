package model

import (
	"time"

	"gorm.io/gorm"
)

// Passkey represents a WebAuthn credential for a user within a specific tenant.
// Each tenant has an independent passkey namespace: the same physical authenticator
// produces different credentials for different tenants because each tenant has a
// unique RPID.  The composite unique index (credential_id, tenant_id) is created
// by the migration layer.
type Passkey struct {
	gorm.Model
	UserID       uint       `gorm:"not null;index"`             // 用户ID
	TenantID     uint       `gorm:"not null;index;default:0"`   // 租户ID（0=系统租户）
	CredentialID string     `gorm:"size:255;not null"`          // WebAuthn凭证ID (base64编码)，在同一租户内唯一
	PublicKey    []byte     `gorm:"type:blob"`                  // 公钥数据
	SignCount    uint32     `gorm:"default:0"`                  // 签名计数器
	Name         string     `gorm:"size:100"`                   // 用户给passkey起的名字
	UserHandle   string     `gorm:"size:255"`                   // WebAuthn用户句柄
	LastUsedAt   *time.Time                                     // 最后使用时间

	// 关联用户
	User User `gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (Passkey) TableName() string {
	return "system_passkeys"
}
