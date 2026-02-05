package verification

import (
	"time"
)

// VerificationConfig 验证码配置
type VerificationConfig struct {
	// 验证码基本配置
	CodeLength  int    `yaml:"code_length"`  // 验证码长度: 6/8
	CodeCharset string `yaml:"code_charset"` // 验证码字符集: "numeric", "alphanumeric"
	CodeTTL     int    `yaml:"code_ttl"`     // 验证码有效期（分钟）: 5-15

	// 尝试控制
	MaxAttempts int `yaml:"max_attempts"` // 最大尝试次数: 5（高风险3）

	// 重发控制
	ResendCooldown        int    `yaml:"resend_cooldown"`          // 重发冷却时间（秒）: 60（高风险120）
	MaxResendsPerHour     int    `yaml:"max_resends_per_hour"`     // 每小时最大重发次数: 5（高风险3）
	MaxResendsPerDay      int    `yaml:"max_resends_per_day"`      // 每天最大重发次数: 10（高风险5）
	RotateCodeOnResend    bool   `yaml:"rotate_code_on_resend"`    // 重发是否换码
	ExtendTTLOnResend     string `yaml:"extend_ttl_on_resend"`     // "none", "reset_to_full", "add_small"
	ResetAttemptsOnResend bool   `yaml:"reset_attempts_on_resend"` // 重发是否重置尝试次数

	// CAPTCHA 控制
	RequireCaptchaOnResendAfter int    `yaml:"require_captcha_on_resend_after"` // 重发超过N次要求验证码
	RequireCaptchaOnSignupRisk  string `yaml:"require_captcha_on_signup_risk"`  // "medium", "high"

	// 邮箱更改策略
	EmailChangePolicy string `yaml:"email_change_policy"` // "allow_before_verified"

	// 注册会话配置
	SignupSessionTTL int `yaml:"signup_session_ttl"` // 注册会话有效期（小时）: 24
}

// RiskLevelConfig 风险等级配置
type RiskLevelConfig struct {
	Low    VerificationConfig `yaml:"low"`
	Medium VerificationConfig `yaml:"medium"`
	High   VerificationConfig `yaml:"high"`
}

// DefaultConfig 默认配置
func DefaultConfig() *RiskLevelConfig {
	return &RiskLevelConfig{
		Low: VerificationConfig{
			CodeLength:                  6,
			CodeCharset:                 "numeric",
			CodeTTL:                     10, // 10 分钟
			MaxAttempts:                 5,
			ResendCooldown:              60, // 60 秒
			MaxResendsPerHour:           5,
			MaxResendsPerDay:            10,
			RotateCodeOnResend:          false,
			ExtendTTLOnResend:           "none",
			ResetAttemptsOnResend:       false,
			RequireCaptchaOnResendAfter: 3,
			RequireCaptchaOnSignupRisk:  "high",
			EmailChangePolicy:           "allow_before_verified",
			SignupSessionTTL:            24, // 24 小时
		},
		Medium: VerificationConfig{
			CodeLength:                  6,
			CodeCharset:                 "numeric",
			CodeTTL:                     8, // 8 分钟
			MaxAttempts:                 4,
			ResendCooldown:              90, // 90 秒
			MaxResendsPerHour:           4,
			MaxResendsPerDay:            8,
			RotateCodeOnResend:          true,
			ExtendTTLOnResend:           "add_small",
			ResetAttemptsOnResend:       false,
			RequireCaptchaOnResendAfter: 2,
			RequireCaptchaOnSignupRisk:  "medium",
			EmailChangePolicy:           "allow_before_verified",
			SignupSessionTTL:            24,
		},
		High: VerificationConfig{
			CodeLength:                  8,
			CodeCharset:                 "alphanumeric",
			CodeTTL:                     5, // 5 分钟
			MaxAttempts:                 3,
			ResendCooldown:              120, // 120 秒
			MaxResendsPerHour:           3,
			MaxResendsPerDay:            5,
			RotateCodeOnResend:          true,
			ExtendTTLOnResend:           "reset_to_full",
			ResetAttemptsOnResend:       false,
			RequireCaptchaOnResendAfter: 1,
			RequireCaptchaOnSignupRisk:  "low", // 高风险时任何注册都要验证码
			EmailChangePolicy:           "allow_before_verified",
			SignupSessionTTL:            12, // 12 小时
		},
	}
}

// GetConfigByRiskLevel 根据风险等级获取配置
func (c *RiskLevelConfig) GetConfigByRiskLevel(riskLevel string) VerificationConfig {
	switch riskLevel {
	case "medium":
		return c.Medium
	case "high":
		return c.High
	default:
		return c.Low
	}
}

// GetTTLDuration 获取验证码TTL时长
func (c *VerificationConfig) GetTTLDuration() time.Duration {
	return time.Duration(c.CodeTTL) * time.Minute
}

// GetResendCooldownDuration 获取重发冷却时长
func (c *VerificationConfig) GetResendCooldownDuration() time.Duration {
	return time.Duration(c.ResendCooldown) * time.Second
}

// GetSignupSessionTTLDuration 获取注册会话TTL时长
func (c *VerificationConfig) GetSignupSessionTTLDuration() time.Duration {
	return time.Duration(c.SignupSessionTTL) * time.Hour
}

// ShouldRequireCaptcha 判断是否需要验证码
func (c *VerificationConfig) ShouldRequireCaptcha(resendCount int, riskLevel string) bool {
	if resendCount >= c.RequireCaptchaOnResendAfter {
		return true
	}

	switch c.RequireCaptchaOnSignupRisk {
	case "low":
		return true
	case "medium":
		return riskLevel == "medium" || riskLevel == "high"
	case "high":
		return riskLevel == "high"
	}

	return false
}

// GetLockDuration 获取锁定时长
func GetLockDuration() time.Duration {
	return 15 * time.Minute
}
