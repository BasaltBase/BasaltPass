package auth

// RegisterRequest defines the input for user registration.
type RegisterRequest struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
	TenantID uint   `json:"tenant_id"` // 租户ID，普通用户必须提供
}

// LoginRequest defines input for login.
type LoginRequest struct {
	EmailOrPhone string `json:"identifier"`
	Password     string `json:"password"`
	TenantID     uint   `json:"tenant_id"` // 租户ID，用于识别用户属于哪个租户
}

// Verify2FARequest defines input for 2FA verification.
// PreAuthToken is a short-lived JWT issued by LoginV2 after the first-factor check
// succeeds. The server extracts user_id and tenant_id from the token; the client
// must never submit these values directly.
type Verify2FARequest struct {
	PreAuthToken string `json:"pre_auth_token"`      // replaces user_id / tenant_id
	TwoFAType    string `json:"two_fa_type"`
	Code         string `json:"code,omitempty"`      // TOTP / email OTP
	Passkey      string `json:"passkey,omitempty"`   // passkey data if any

	// WebAuthn verification fields for passkey flow
	Email     string `json:"email,omitempty"`     // user email (passkey)
	Challenge string `json:"challenge,omitempty"` // WebAuthn challenge
}
