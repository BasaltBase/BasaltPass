package auth

import (
	"os"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte(getEnv("JWT_SECRET", "supersecret"))

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

// GenerateTokenPair creates JWT access and refresh tokens for a user id.
func GenerateTokenPair(userID uint) (TokenPair, error) {
	return GenerateTokenPairWithTenant(userID, 0)
}

// GenerateTokenPairWithTenant creates JWT tokens with tenant context
func GenerateTokenPairWithTenant(userID uint, tenantID uint) (TokenPair, error) {
	// 如果没有指定租户ID，尝试获取用户的默认租户
	if tenantID == 0 {
		tenantID = getUserDefaultTenant(userID)
	}

	accessClaims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID, // 租户ID
		"exp": time.Now().Add(15 * time.Minute).Unix(),
	}
	accessToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(jwtSecret)
	if err != nil {
		return TokenPair{}, err
	}

	refreshClaims := jwt.MapClaims{
		"sub": userID,
		"tid": tenantID,
		"exp": time.Now().Add(7 * 24 * time.Hour).Unix(),
		"typ": "refresh",
	}
	refreshToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims).SignedString(jwtSecret)
	if err != nil {
		return TokenPair{}, err
	}

	return TokenPair{AccessToken: accessToken, RefreshToken: refreshToken}, nil
}

// getUserDefaultTenant 获取用户的默认租户ID
func getUserDefaultTenant(userID uint) uint {
	var tenantAdmin model.TenantAdmin
	if err := common.DB().Where("user_id = ?", userID).Order("created_at ASC").First(&tenantAdmin).Error; err != nil {
		// 如果没有找到用户租户关联，返回默认租户ID
		var defaultTenant model.Tenant
		if err := common.DB().Where("code = ?", "default").First(&defaultTenant).Error; err == nil {
			return defaultTenant.ID
		}
		return 1 // 最后的兜底值
	}
	return tenantAdmin.TenantID
}

// ParseToken validates a JWT and returns claims.
func ParseToken(tokenStr string) (*jwt.Token, error) {
	return jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})
}
