package auth

import (
	"errors"
	"os"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	tenantservice "basaltpass-backend/internal/service/tenant"

	"github.com/golang-jwt/jwt/v5"
)

func mustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		if os.Getenv("BASALTPASS_DYNO_MODE") == "test" {
			return "test-secret" // Allow test mode
		}
		panic("environment variable " + key + " is required")
	}
	return v
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// TokenPair contains access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

const (
	ConsoleScopeUser   = "user"
	ConsoleScopeTenant = "tenant"
	ConsoleScopeAdmin  = "admin"

	TokenTypeAccess  = "access"
	TokenTypeRefresh = "refresh"
	TokenTypePreAuth = "pre_auth"
)

// GenerateTokenPair creates JWT access and refresh tokens for a user id.
// 自动从用户记录中获取tenant_id
func GenerateTokenPair(userID uint) (TokenPair, error) {
	// 从数据库获取用户的tenant_id
	var user model.User
	if err := common.DB().Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		return TokenPair{}, err
	}
	tenantID, err := resolveTokenTenantID(userID, user.TenantID, ConsoleScopeUser)
	if err != nil {
		return TokenPair{}, err
	}
	return GenerateTokenPairWithTenantAndScope(userID, tenantID, ConsoleScopeUser)
}

// GenerateTokenPairWithTenant creates JWT tokens with tenant context
func GenerateTokenPairWithTenant(userID uint, tenantID uint) (TokenPair, error) {
	return GenerateTokenPairWithTenantAndScope(userID, tenantID, ConsoleScopeUser)
}

// GenerateTokenPairWithTenantAndScope creates JWT tokens with tenant context and console scope.
//
// Scopes:
// - user: default, minimal privilege
// - tenant: tenant console
// - admin: global admin console
func GenerateTokenPairWithTenantAndScope(userID uint, tenantID uint, scope string) (TokenPair, error) {
	if scope == "" {
		scope = ConsoleScopeUser
	}

	if scope != ConsoleScopeAdmin && tenantID > 0 {
		allowed, err := tenantservice.IsTenantLoginAllowed(tenantID)
		if err != nil {
			return TokenPair{}, err
		}
		if !allowed {
			return TokenPair{}, ErrTenantLoginDisabled
		}
	}

	accessClaims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID, // 租户ID - 现在直接使用user.tenant_id
		"scp": scope,    // console scope
		"typ": TokenTypeAccess,
		"exp": time.Now().Add(15 * time.Minute).Unix(),
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(common.MustJWTSecret())
	if err != nil {
		return TokenPair{}, err
	}

	refreshClaims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID,
		"scp": scope,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
		"typ": TokenTypeRefresh,
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(common.MustJWTSecret())
	if err != nil {
		return TokenPair{}, err
	}

	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

func resolveTokenTenantID(userID uint, claimedTenantID uint, scope string) (uint, error) {
	if scope == ConsoleScopeAdmin {
		return 0, nil
	}

	var user model.User
	if err := common.DB().Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		return 0, err
	}

	if claimedTenantID > 0 {
		if user.TenantID == claimedTenantID {
			return claimedTenantID, nil
		}

		var membershipCount int64
		if err := common.DB().Model(&model.TenantUser{}).
			Where("user_id = ? AND tenant_id = ?", userID, claimedTenantID).
			Count(&membershipCount).Error; err != nil {
			return 0, err
		}
		if membershipCount > 0 {
			return claimedTenantID, nil
		}
	}

	if user.TenantID > 0 {
		return user.TenantID, nil
	}

	// 平台级账号（tenant_id=0）在 user scope 下保持 tenant_id=0，
	// 避免因为历史 tenant_users 记录被错误带入某个租户上下文。
	return 0, nil
}

// ParseToken validates a JWT and returns claims.
func ParseToken(tokenStr string) (*jwt.Token, error) {
	return jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return common.MustJWTSecret(), nil
	})
}

// ValidateAccessTokenType accepts explicit access tokens and, during the
// compatibility window, legacy access tokens without a typ claim. Refresh
// tokens and all other typed tokens are rejected.
func ValidateAccessTokenType(claims jwt.MapClaims) error {
	if claims == nil {
		return errors.New("invalid token claims")
	}

	typ, hasType := claims["typ"]
	if !hasType || typ == nil {
		return nil
	}

	typStr, ok := typ.(string)
	if !ok {
		return errors.New("invalid token type")
	}

	switch typStr {
	case "", TokenTypeAccess:
		return nil
	case TokenTypeRefresh:
		return errors.New("refresh token not allowed")
	default:
		return errors.New("invalid token type")
	}
}

// GeneratePreAuthToken issues a short-lived (5 min) one-time token emitted after the
// first-factor (password) check succeeds when 2FA is required.
// The token carries the verified user identity so the 2FA step never trusts a
// client-supplied user_id.
func GeneratePreAuthToken(userID uint, tenantID uint) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID,
		"typ": TokenTypePreAuth,
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(common.MustJWTSecret())
}

// ParsePreAuthToken validates a pre_auth token and extracts the embedded user / tenant IDs.
// Returns an error if the token is expired, tampered with, or not of type "pre_auth".
func ParsePreAuthToken(tokenStr string) (userID uint, tenantID uint, err error) {
	token, parseErr := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return common.MustJWTSecret(), nil
	})
	if parseErr != nil || token == nil || !token.Valid {
		return 0, 0, errors.New("invalid or expired 2FA session token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != TokenTypePreAuth {
		return 0, 0, errors.New("invalid token type")
	}
	subFloat, ok := claims["sub"].(float64)
	if !ok {
		return 0, 0, errors.New("missing subject in token")
	}
	tidFloat, _ := claims["tid"].(float64)
	return uint(subFloat), uint(tidFloat), nil
}
