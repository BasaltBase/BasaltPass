package model

import (
	"time"

	"gorm.io/gorm"
)

// Passkey represents a WebAuthn credential for a user
type Passkey struct {
	gorm.Model
	UserID       uint       `gorm:"not null;index"`       // 用户ID
	CredentialID string     `gorm:"uniqueIndex;size:255"` // WebAuthn凭证ID (base64编码)
	PublicKey    []byte     `gorm:"type:blob"`            // 公钥数据
	SignCount    uint32     `gorm:"default:0"`            // 签名计数器
	Name         string     `gorm:"size:100"`             // 用户给passkey起的名字
	UserHandle   string     `gorm:"size:255"`             // WebAuthn用户句柄
	LastUsedAt   *time.Time // 最后使用时间

	// 关联用户
	User User `gorm:"foreignKey:UserID"`
}

// TableName 指定表名
func (Passkey) TableName() string {
	return "passkeys"
}
