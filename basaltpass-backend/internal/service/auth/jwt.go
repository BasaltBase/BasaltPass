package auth

import (
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
