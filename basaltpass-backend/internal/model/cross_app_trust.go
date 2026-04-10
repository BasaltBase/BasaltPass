package model

import "time"

// CrossAppTrust defines a trust relationship that allows SourceApp to perform
// Token Exchange and obtain a narrowed-scope access token for TargetApp on
// behalf of users.  Managed by tenant admins.
//
// RFC 8693 — OAuth 2.0 Token Exchange
type CrossAppTrust struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TenantID      uint      `gorm:"not null;index" json:"tenant_id"`
	SourceAppID   uint      `gorm:"not null;index" json:"source_app_id"`   // the app that initiates token exchange (e.g. WeavInt)
	TargetAppID   uint      `gorm:"not null;index" json:"target_app_id"`   // the app whose API is being called (e.g. Araneae)
	AllowedScopes string    `gorm:"type:text" json:"allowed_scopes"`       // comma-separated scope list that can be granted
	MaxTokenTTL   int       `gorm:"default:300" json:"max_token_ttl"`      // max token lifetime in seconds (default 5 min)
	Description   string    `gorm:"size:500" json:"description"`           // optional human-readable description
	IsActive      bool      `gorm:"default:true" json:"is_active"`
	CreatedBy     uint      `gorm:"not null" json:"created_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Relations
	Tenant    Tenant `gorm:"foreignKey:TenantID" json:"tenant,omitempty"`
	SourceApp App    `gorm:"foreignKey:SourceAppID" json:"source_app,omitempty"`
	TargetApp App    `gorm:"foreignKey:TargetAppID" json:"target_app,omitempty"`
	Creator   User   `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// TableName sets the database table name.
func (CrossAppTrust) TableName() string {
	return "cross_app_trusts"
}

// TokenExchangeLog records every token exchange attempt for auditing.
type TokenExchangeLog struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	TenantID        uint      `gorm:"not null;index" json:"tenant_id"`
	UserID          uint      `gorm:"not null;index" json:"user_id"`
	SourceClientID  string    `gorm:"size:64;not null;index" json:"source_client_id"`
	SourceAppID     uint      `gorm:"not null" json:"source_app_id"`
	TargetAppID     uint      `gorm:"not null;index" json:"target_app_id"`
	TrustID         uint      `gorm:"index" json:"trust_id"`
	RequestedScopes string    `gorm:"type:text" json:"requested_scopes"`
	GrantedScopes   string    `gorm:"type:text" json:"granted_scopes"`
	TokenTTL        int       `gorm:"not null" json:"token_ttl"`
	Status          string    `gorm:"size:20;not null" json:"status"`        // "granted" or "denied"
	DenyReason      string    `gorm:"size:500" json:"deny_reason,omitempty"` // reason when denied
	IP              string    `gorm:"size:45" json:"ip"`
	CreatedAt       time.Time `json:"created_at"`

	// Display relations (read only)
	User      User `gorm:"foreignKey:UserID" json:"user,omitempty"`
	SourceApp App  `gorm:"foreignKey:SourceAppID" json:"source_app,omitempty"`
	TargetApp App  `gorm:"foreignKey:TargetAppID" json:"target_app,omitempty"`
}

// TableName sets the database table name.
func (TokenExchangeLog) TableName() string {
	return "token_exchange_logs"
}
