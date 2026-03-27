package model

import (
	"crypto/rand"
	"encoding/hex"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type ManualAPIKeyScope string

const (
	ManualAPIKeyScopeTenant ManualAPIKeyScope = "tenant"
	ManualAPIKeyScopeAdmin  ManualAPIKeyScope = "admin"
)

type ManualAPIKey struct {
	ID              uint              `gorm:"primaryKey" json:"id"`
	Name            string            `gorm:"size:128;not null" json:"name"`
	Scope           ManualAPIKeyScope `gorm:"type:varchar(20);not null;index" json:"scope"`
	TenantID        *uint             `gorm:"index" json:"tenant_id,omitempty"`
	KeyPrefix       string            `gorm:"size:20;not null;index" json:"key_prefix"`
	KeyHash         string            `gorm:"size:128;not null" json:"-"`
	IsActive        bool              `gorm:"default:true;index" json:"is_active"`
	CreatedByUserID uint              `gorm:"not null;index" json:"created_by_user_id"`
	LastUsedAt      *time.Time        `json:"last_used_at,omitempty"`
	ExpiresAt       *time.Time        `gorm:"index" json:"expires_at,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

func (ManualAPIKey) TableName() string {
	return "manual_api_keys"
}

func GenerateManualAPIKeyPlaintext() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return "bpk_" + hex.EncodeToString(buf), nil
}

func ManualAPIKeyPrefix(plain string) string {
	trimmed := strings.TrimSpace(plain)
	if len(trimmed) < 16 {
		return ""
	}
	return trimmed[:16]
}

func (k *ManualAPIKey) SetPlainKey(plain string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), 12)
	if err != nil {
		return err
	}
	k.KeyHash = string(hash)
	k.KeyPrefix = ManualAPIKeyPrefix(plain)
	return nil
}

func (k *ManualAPIKey) VerifyPlainKey(plain string) bool {
	if k.KeyHash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(k.KeyHash), []byte(plain)) == nil
}
