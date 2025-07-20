package auth

import (
	"errors"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/security"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Service encapsulates auth related operations.
type Service struct{}

// Register creates a new user with hashed password.
func (s Service) Register(req RegisterRequest) (*model.User, error) {
	if req.Email == "" && req.Phone == "" {
		return nil, errors.New("email or phone required")
	}
	if req.Password == "" {
		return nil, errors.New("password required")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hash),
		Nickname:     "New User",
	}
	if err := common.DB().Create(user).Error; err != nil {
		return nil, err
	}
	return user, nil
}

// LoginResult 用于登录结果的多态返回
// 如果需要二次验证，Need2FA=true，TokenPair为空
// 如果不需要二次验证，Need2FA=false，TokenPair有效
// Available2FAMethods: 用户可用的所有2FA方式列表
type LoginResult struct {
	Need2FA             bool     `json:"need_2fa"`
	TwoFAType           string   `json:"2fa_type,omitempty"`              // 默认推荐的2FA方式
	Available2FAMethods []string `json:"available_2fa_methods,omitempty"` // 所有可用的2FA方式
	UserID              uint     `json:"user_id,omitempty"`
	TokenPair
}

// Login 校验用户名密码，判断是否需要二次验证
func (s Service) LoginV2(req LoginRequest) (LoginResult, error) {
	if req.EmailOrPhone == "" || req.Password == "" {
		return LoginResult{}, errors.New("identifier and password required")
	}

	var user model.User
	db := common.DB()
	if err := db.Preload("Passkeys").Where("email = ? OR phone = ?", req.EmailOrPhone, req.EmailOrPhone).First(&user).Error; err != nil {
		return LoginResult{}, errors.New("user not found")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return LoginResult{}, errors.New("invalid credentials")
	}

	// 收集用户可用的所有2FA方式
	var availableMethods []string
	var defaultMethod string

	if user.TwoFAEnabled && user.TOTPSecret != "" {
		availableMethods = append(availableMethods, "totp")
		defaultMethod = "totp"
	}
	if len(user.Passkeys) > 0 {
		availableMethods = append(availableMethods, "passkey")
		if defaultMethod == "" {
			defaultMethod = "passkey"
		}
	}
	if !user.EmailVerified {
		availableMethods = append(availableMethods, "email")
		if defaultMethod == "" {
			defaultMethod = "email"
		}
	}

	// 如果有2FA方式，返回需要验证
	if len(availableMethods) > 0 {
		return LoginResult{
			Need2FA:             true,
			TwoFAType:           defaultMethod,
			Available2FAMethods: availableMethods,
			UserID:              user.ID,
		}, nil
	}

	// 不需要二次验证，直接登录
	tokens, err := GenerateTokenPair(user.ID)
	if err != nil {
		return LoginResult{}, err
	}
	return LoginResult{Need2FA: false, TokenPair: tokens}, nil
}

// Refresh validates a refresh token and returns a new token pair.
func (s Service) Refresh(refreshToken string) (TokenPair, error) {
	token, err := ParseToken(refreshToken)
	if err != nil || !token.Valid {
		return TokenPair{}, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return TokenPair{}, errors.New("invalid token type")
	}
	userIDFloat, ok := claims["sub"].(float64)
	if !ok {
		return TokenPair{}, errors.New("invalid subject")
	}
	return GenerateTokenPair(uint(userIDFloat))
}

// Verify2FA 校验二次验证信息，成功返回token
func (s Service) Verify2FA(req Verify2FARequest) (TokenPair, error) {
	db := common.DB()
	var user model.User
	if err := db.Preload("Passkeys").First(&user, req.UserID).Error; err != nil {
		return TokenPair{}, errors.New("user not found")
	}
	switch req.TwoFAType {
	case "totp":
		if user.TOTPSecret == "" || !user.TwoFAEnabled {
			return TokenPair{}, errors.New("2FA not enabled")
		}
		if !security.ValidateTOTP(user.TOTPSecret, req.Code) {
			return TokenPair{}, errors.New("invalid TOTP code")
		}
	case "passkey":
		// 这里只做简单校验，实际Passkey校验应由passkey模块完成
		if len(user.Passkeys) == 0 {
			return TokenPair{}, errors.New("no passkey registered")
		}
		// 这里假设前端已完成WebAuthn流程，后端只需确认用户有passkey
		// 可扩展为调用passkey.FinishLoginHandler等
	case "email":
		if !user.EmailVerified {
			return TokenPair{}, errors.New("email not verified")
		}
		// 邮箱验证码校验逻辑可扩展
	default:
		return TokenPair{}, errors.New("unsupported 2FA type")
	}
	return GenerateTokenPair(user.ID)
}
