package model

import (
	"time"

	"gorm.io/gorm"
)

// EmailChangeStatus 邮箱变更状态
type EmailChangeStatus string

const (
	EmailChangePending   EmailChangeStatus = "PENDING"
	EmailChangeConfirmed EmailChangeStatus = "CONFIRMED"
	EmailChangeCancelled EmailChangeStatus = "CANCELLED"
	EmailChangeExpired   EmailChangeStatus = "EXPIRED"
)

// EmailChangeRequest 邮箱变更请求
type EmailChangeRequest struct {
	ID          uint `gorm:"primaryKey"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt    `gorm:"index"`
	UserID      uint              `gorm:"not null;index"`
	NewEmail    string            `gorm:"size:128;not null"`
	TokenHash   string            `gorm:"size:255;not null;uniqueIndex"`
	ExpiresAt   time.Time         `gorm:"not null"`
	Status      EmailChangeStatus `gorm:"size:20;not null;default:'PENDING'"`
	RequestedIP string            `gorm:"size:45"` // IPv6 最长39字符，留余量
	DeviceHash  string            `gorm:"size:64"` // 设备指纹哈希

	// 关联关系
	User *User `gorm:"foreignKey:UserID"`
}

// IsExpired 检查请求是否过期
func (r *EmailChangeRequest) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

// IsValid 检查请求是否有效
func (r *EmailChangeRequest) IsValid() bool {
	return r.Status == EmailChangePending && !r.IsExpired()
}

// PasswordResetToken 密码重置令牌
type PasswordResetToken struct {
	ID          uint `gorm:"primaryKey"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
	UserID      uint           `gorm:"not null;index"`
	TokenHash   string         `gorm:"size:255;not null;uniqueIndex"`
	ExpiresAt   time.Time      `gorm:"not null"`
	UsedAt      *time.Time
	RequestedIP string `gorm:"size:45"`
	DeviceHash  string `gorm:"size:64"`

	// 关联关系
	User *User `gorm:"foreignKey:UserID"`
}

// IsExpired 检查令牌是否过期
func (r *PasswordResetToken) IsExpired() bool {
	return time.Now().After(r.ExpiresAt)
}

// IsUsed 检查令牌是否已使用
func (r *PasswordResetToken) IsUsed() bool {
	return r.UsedAt != nil
}

// IsValid 检查令牌是否有效
func (r *PasswordResetToken) IsValid() bool {
	return !r.IsExpired() && !r.IsUsed()
}

// MarkAsUsed 标记令牌为已使用
func (r *PasswordResetToken) MarkAsUsed() {
	now := time.Now()
	r.UsedAt = &now
}

// EmailVerificationToken 邮箱验证令牌
// 用于已登录用户通过邮件验证自己的邮箱地址。
// 流程：
//  1. 调用 POST /security/email/send → 生成6位随机数字码，SHA-256 哈希后存此表，明文发至用户邮箱
//  2. 调用 POST /security/email/verify + {"code":"XXXXXX"} → 哈希比对，通过则将 users.email_verified 置 true
type EmailVerificationToken struct {
	ID           uint       `gorm:"primaryKey"`
	CreatedAt    time.Time
	UserID       uint       `gorm:"not null;index"`
	Email        string     `gorm:"size:128;not null"` // 待验证的邮箱地址
	CodeHash     string     `gorm:"size:64;not null"`  // SHA-256(code)
	ExpiresAt    time.Time  `gorm:"not null;index"`
	UsedAt       *time.Time // 验证成功后设置
	AttemptCount int        `gorm:"not null;default:0"` // 尝试次数（防暴力枚举）
	RequestedIP  string     `gorm:"size:45"`

	User *User `gorm:"foreignKey:UserID"`
}

const EmailVerificationMaxAttempts = 5
const EmailVerificationTTL = 30 // 分钟
const EmailVerificationResendCooldown = 60 // 秒，重发冷却

// IsExpired 是否已过期
func (t *EmailVerificationToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// IsUsed 是否已使用
func (t *EmailVerificationToken) IsUsed() bool {
	return t.UsedAt != nil
}

// IsValid 是否仍可用于验证
func (t *EmailVerificationToken) IsValid() bool {
	return !t.IsExpired() && !t.IsUsed() && t.AttemptCount < EmailVerificationMaxAttempts
}

// SecurityOperation 安全操作记录 - 用于冷却控制
type SecurityOperation struct {
	ID         uint `gorm:"primaryKey"`
	CreatedAt  time.Time
	UserID     uint   `gorm:"not null;index"`
	Operation  string `gorm:"size:50;not null"` // password_change, email_change, etc.
	IP         string `gorm:"size:45"`
	DeviceHash string `gorm:"size:64"`
	Success    bool   `gorm:"not null;default:false"`

	// 关联关系
	User *User `gorm:"foreignKey:UserID"`
}
