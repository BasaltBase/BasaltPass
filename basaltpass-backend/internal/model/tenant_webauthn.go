package model

import "time"

// TenantWebAuthnConfig stores per-tenant WebAuthn (Passkey) RP configuration.
// TenantID = 0 is reserved for the system / platform tenant.
// Each tenant has its own RPID and allowed origins, ensuring passkeys are
// completely isolated between tenants.
type TenantWebAuthnConfig struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TenantID      uint      `gorm:"uniqueIndex;not null" json:"tenant_id"`
	RPID          string    `gorm:"size:255;not null" json:"rp_id"`
	RPDisplayName string    `gorm:"size:128;not null" json:"rp_display_name"`
	RPOrigins     string    `gorm:"type:text;not null" json:"rp_origins"` // JSON-encoded []string
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

func (TenantWebAuthnConfig) TableName() string {
	return "tenant_webauthn_configs"
}
