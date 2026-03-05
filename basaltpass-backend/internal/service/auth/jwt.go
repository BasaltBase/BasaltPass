package auth

import (
	"errors"
	"os"
	"strings"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func getJWTSecret() []byte {
	if len(jwtSecret) != 0 {
		return jwtSecret
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Allow tests to run without requiring an env var.
		// go test builds a binary typically named "*.test".
		if os.Getenv("BASALTPASS_DYNO_MODE") == "test" || strings.HasSuffix(os.Args[0], ".test") {
			secret = "test-secret"
		} else {
			panic("environment variable JWT_SECRET is required")
		}
	}

	jwtSecret = []byte(secret)
	return jwtSecret
}

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
)

// GenerateTokenPair creates JWT access and refresh tokens for a user id.
// 自动从用户记录中获取tenant_id
func GenerateTokenPair(userID uint) (TokenPair, error) {
	// 从数据库获取用户的tenant_id
	var user model.User
	if err := common.DB().Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		return TokenPair{}, err
	}
	return GenerateTokenPairWithTenantAndScope(userID, user.TenantID, ConsoleScopeUser)
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

	accessClaims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID, // 租户ID - 现在直接使用user.tenant_id
		"scp": scope,    // console scope
		"exp": time.Now().Add(15 * time.Minute).Unix(),
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(getJWTSecret())
	if err != nil {
		return TokenPair{}, err
	}

	refreshClaims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID,
		"scp": scope,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
		"typ": "refresh",
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(getJWTSecret())
	if err != nil {
		return TokenPair{}, err
	}

	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

// getUserDefaultTenant 获取用户的默认租户ID
func getUserDefaultTenant(userID uint) uint {
	var tenantUser model.TenantUser
	if err := common.DB().Where("user_id = ?", userID).Order("created_at ASC").First(&tenantUser).Error; err != nil {
		// 如果没有找到用户租户关联，返回默认租户ID
		var defaultTenant model.Tenant
		if err := common.DB().Where("code = ?", "default").First(&defaultTenant).Error; err == nil {
			return defaultTenant.ID
		}
		return 1 // 最后的兜底值
	}
	return tenantUser.TenantID
}

// ParseToken validates a JWT and returns claims.
func ParseToken(tokenStr string) (*jwt.Token, error) {
	return jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})
}

// GeneratePreAuthToken issues a short-lived (5 min) one-time token emitted after the
// first-factor (password) check succeeds when 2FA is required.
// The token carries the verified user identity so the 2FA step never trusts a
// client-supplied user_id.
func GeneratePreAuthToken(userID uint, tenantID uint) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID,
		"typ": "pre_auth",
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(getJWTSecret())
}

// ParsePreAuthToken validates a pre_auth token and extracts the embedded user / tenant IDs.
// Returns an error if the token is expired, tampered with, or not of type "pre_auth".
func ParsePreAuthToken(tokenStr string) (userID uint, tenantID uint, err error) {
	token, parseErr := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return getJWTSecret(), nil
	})
	if parseErr != nil || token == nil || !token.Valid {
		return 0, 0, errors.New("invalid or expired 2FA session token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "pre_auth" {
		return 0, 0, errors.New("invalid token type")
	}
	subFloat, ok := claims["sub"].(float64)
	if !ok {
		return 0, 0, errors.New("missing subject in token")
	}
	tidFloat, _ := claims["tid"].(float64)
	return uint(subFloat), uint(tidFloat), nil
}
