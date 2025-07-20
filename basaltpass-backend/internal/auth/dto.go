package auth

// RegisterRequest defines the input for user registration.
type RegisterRequest struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Password string `json:"password"`
}

// LoginRequest defines input for login.
type LoginRequest struct {
	EmailOrPhone string `json:"identifier"`
	Password     string `json:"password"`
}

// Verify2FARequest defines input for 2FA verification.
type Verify2FARequest struct {
	UserID    uint   `json:"user_id"`
	TwoFAType string `json:"two_fa_type"`
	Code      string `json:"code,omitempty"`    // TOTP/邮箱验证码
	Passkey   string `json:"passkey,omitempty"` // Passkey相关数据（如有）

	// WebAuthn verification data for passkey
	Email     string `json:"email,omitempty"`     // 用户邮箱（passkey验证需要）
	Challenge string `json:"challenge,omitempty"` // WebAuthn challenge
}
