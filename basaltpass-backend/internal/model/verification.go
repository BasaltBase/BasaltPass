package model

import (
	"time"

	"gorm.io/gorm"
)

// SignupStatus 注册状态
type SignupStatus string

const (
	SignupStatusPendingEmail SignupStatus = "PENDING_EMAIL"
	SignupStatusPendingPhone SignupStatus = "PENDING_PHONE"
	SignupStatusCompleted    SignupStatus = "COMPLETED"
	SignupStatusExpired      SignupStatus = "EXPIRED"
)

// PendingSignup 注册会话表，跟踪未完成的注册
type PendingSignup struct {
	gorm.Model
	ID           string       `gorm:"primaryKey;type:varchar(32)"` // 随机生成的不可猜测ID
	Email        string       `gorm:"type:varchar(255);index"`     // 未验证的邮箱
	Phone        string       `gorm:"type:varchar(32);index"`      // 未验证的手机号
	Username     string       `gorm:"type:varchar(64)"`            // 用户名
	PasswordHash string       `gorm:"type:varchar(255)"`           // 密码哈希
	TenantID     uint         `gorm:"index;not null;default:0"`    // 租户ID，0表示平台用户
	Status       SignupStatus `gorm:"type:varchar(20);default:'PENDING_EMAIL'"`
	ExpiresAt    time.Time    `gorm:"index"` // 24小时过期

	// 风控字段
	IPHash        string `gorm:"type:varchar(128);index"`        // IP地址哈希
	DeviceIDHash  string `gorm:"type:varchar(128);index"`        // 设备ID哈希
	UserAgentHash string `gorm:"type:varchar(128)"`              // User-Agent哈希
	RiskLevel     string `gorm:"type:varchar(10);default:'low'"` // low/medium/high

	// 关联的验证码挑战
	Challenges []VerificationChallenge `gorm:"foreignKey:SignupID"`
}

// ChallengeStatus 验证码状态
type ChallengeStatus string

const (
	ChallengeStatusActive      ChallengeStatus = "ACTIVE"
	ChallengeStatusVerified    ChallengeStatus = "VERIFIED"
	ChallengeStatusInvalidated ChallengeStatus = "INVALIDATED"
	ChallengeStatusExpired     ChallengeStatus = "EXPIRED"
)

// ChallengeChannel 验证码渠道
type ChallengeChannel string

const (
	ChallengeChannelEmail ChallengeChannel = "email"
	ChallengeChannelSMS   ChallengeChannel = "sms"
)

// VerificationChallenge 验证码挑战表
type VerificationChallenge struct {
	gorm.Model
	ID        uint             `gorm:"primaryKey"`
	SignupID  string           `gorm:"type:varchar(32);index"`  // 关联的注册会话ID
	Channel   ChallengeChannel `gorm:"type:varchar(10);index"`  // email/sms
	Target    string           `gorm:"type:varchar(255);index"` // 邮箱或手机号（规范化后）
	CodeHash  string           `gorm:"type:varchar(255)"`       // 验证码哈希
	CodeSalt  string           `gorm:"type:varchar(64)"`        // 验证码盐值
	ExpiresAt time.Time        `gorm:"index"`                   // 验证码过期时间

	// 尝试控制
	AttemptCount int        `gorm:"default:0"` // 已尝试次数
	MaxAttempts  int        `gorm:"default:5"` // 最大尝试次数
	LockedUntil  *time.Time `gorm:"index"`     // 锁定到什么时候

	// 重发控制
	ResendCount int       `gorm:"default:0"` // 重发次数
	NextSendAt  time.Time `gorm:"index"`     // 最早下次重发时间

	// 状态
	Status ChallengeStatus `gorm:"type:varchar(15);default:'ACTIVE'"`

	// 关联
	PendingSignup PendingSignup `gorm:"foreignKey:SignupID;references:ID"`
}

// IsExpired 检查验证码是否已过期
func (vc *VerificationChallenge) IsExpired() bool {
	return time.Now().After(vc.ExpiresAt)
}

// IsLocked 检查是否被锁定
func (vc *VerificationChallenge) IsLocked() bool {
	return vc.LockedUntil != nil && time.Now().Before(*vc.LockedUntil)
}

// CanAttempt 检查是否可以尝试验证
func (vc *VerificationChallenge) CanAttempt() bool {
	return vc.Status == ChallengeStatusActive &&
		!vc.IsExpired() &&
		!vc.IsLocked() &&
		vc.AttemptCount < vc.MaxAttempts
}

// CanResend 检查是否可以重发
func (vc *VerificationChallenge) CanResend() bool {
	return vc.Status == ChallengeStatusActive &&
		time.Now().After(vc.NextSendAt) &&
		!vc.IsLocked()
}

// IsActive 检查挑战是否处于活跃状态
func (vc *VerificationChallenge) IsActive() bool {
	return vc.Status == ChallengeStatusActive && !vc.IsExpired()
}
