package utils

import (
	"errors"
	"net/mail"
	"strings"
)

// EmailValidator 提供邮箱验证和规范化功能
type EmailValidator struct{}

// NewEmailValidator 创建新的邮箱验证器
func NewEmailValidator() *EmailValidator {
	return &EmailValidator{}
}

// Validate 验证邮箱格式是否合法
func (ev *EmailValidator) Validate(email string) error {
	normalized := strings.TrimSpace(strings.ToLower(email))
	if normalized == "" {
		return errors.New("邮箱不能为空")
	}

	addr, err := mail.ParseAddress(normalized)
	if err != nil || addr.Address != normalized {
		return errors.New("邮箱格式不正确")
	}

	parts := strings.Split(normalized, "@")
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return errors.New("邮箱格式不正确")
	}

	if strings.HasPrefix(parts[1], ".") || strings.HasSuffix(parts[1], ".") || !strings.Contains(parts[1], ".") {
		return errors.New("邮箱格式不正确")
	}

	return nil
}

// Normalize 规范化邮箱（trim + lower）
func (ev *EmailValidator) Normalize(email string) (string, error) {
	normalized := strings.TrimSpace(strings.ToLower(email))
	if err := ev.Validate(normalized); err != nil {
		return "", err
	}
	return normalized, nil
}
