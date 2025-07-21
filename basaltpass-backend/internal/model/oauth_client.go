package model

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"gorm.io/gorm"
)

// OAuthClient 表示一个OAuth2客户端（业务应用）
type OAuthClient struct {
	gorm.Model
	Name         string `gorm:"size:100;not null" json:"name"`                                           // 应用名称
	Description  string `gorm:"size:500" json:"description"`                                             // 应用描述
	ClientID     string `gorm:"size:64;uniqueIndex;not null" json:"client_id"`                           // 客户端ID
	ClientSecret string `gorm:"size:128;not null" json:"-"`                                              // 客户端密钥（不返回给前端）
	RedirectURIs string `gorm:"type:text;not null" json:"redirect_uris"`                                 // 允许的重定向URI列表（用逗号分隔）
	Scopes       string `gorm:"type:text" json:"scopes"`                                                 // 允许的权限范围（用逗号分隔）
	GrantTypes   string `gorm:"type:text;default:'authorization_code,refresh_token'" json:"grant_types"` // 支持的授权类型
	IsActive     bool   `gorm:"default:true" json:"is_active"`                                           // 是否激活

	// 应用配置
	AllowedOrigins string `gorm:"type:text" json:"allowed_origins"` // 允许的CORS源（用逗号分隔）

	// 统计信息
	LastUsedAt *time.Time `json:"last_used_at"`               // 最后使用时间
	CreatedBy  uint       `gorm:"not null" json:"created_by"` // 创建者用户ID

	// 关联
	Creator User `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
}

// GenerateClientCredentials 生成客户端ID和密钥
func (c *OAuthClient) GenerateClientCredentials() error {
	// 生成客户端ID（16位随机字符串）
	clientIDBytes := make([]byte, 16)
	if _, err := rand.Read(clientIDBytes); err != nil {
		return err
	}
	c.ClientID = hex.EncodeToString(clientIDBytes)

	// 生成客户端密钥（32位随机字符串）
	clientSecretBytes := make([]byte, 32)
	if _, err := rand.Read(clientSecretBytes); err != nil {
		return err
	}
	c.ClientSecret = hex.EncodeToString(clientSecretBytes)

	return nil
}

// GetRedirectURIList 获取重定向URI列表
func (c *OAuthClient) GetRedirectURIList() []string {
	if c.RedirectURIs == "" {
		return []string{}
	}
	return strings.Split(c.RedirectURIs, ",")
}

// SetRedirectURIList 设置重定向URI列表
func (c *OAuthClient) SetRedirectURIList(uris []string) {
	c.RedirectURIs = strings.Join(uris, ",")
}

// GetScopeList 获取权限范围列表
func (c *OAuthClient) GetScopeList() []string {
	if c.Scopes == "" {
		return []string{}
	}
	return strings.Split(c.Scopes, ",")
}

// SetScopeList 设置权限范围列表
func (c *OAuthClient) SetScopeList(scopes []string) {
	c.Scopes = strings.Join(scopes, ",")
}

// GetGrantTypeList 获取授权类型列表
func (c *OAuthClient) GetGrantTypeList() []string {
	if c.GrantTypes == "" {
		return []string{"authorization_code", "refresh_token"}
	}
	return strings.Split(c.GrantTypes, ",")
}

// ValidateRedirectURI 验证重定向URI是否被允许
func (c *OAuthClient) ValidateRedirectURI(uri string) bool {
	allowedURIs := c.GetRedirectURIList()
	for _, allowedURI := range allowedURIs {
		if strings.TrimSpace(allowedURI) == uri {
			return true
		}
	}
	return false
}

// HashClientSecret 对客户端密钥进行哈希处理
func (c *OAuthClient) HashClientSecret() {
	if c.ClientSecret != "" {
		hash := sha256.Sum256([]byte(c.ClientSecret))
		c.ClientSecret = hex.EncodeToString(hash[:])
	}
}

// VerifyClientSecret 验证客户端密钥
func (c *OAuthClient) VerifyClientSecret(secret string) bool {
	hash := sha256.Sum256([]byte(secret))
	hashedSecret := hex.EncodeToString(hash[:])
	return c.ClientSecret == hashedSecret
}

// OAuthAuthorizationCode 表示OAuth2授权码
type OAuthAuthorizationCode struct {
	gorm.Model
	Code                string    `gorm:"size:128;uniqueIndex;not null" json:"code"`
	ClientID            string    `gorm:"size:64;not null;index" json:"client_id"`
	UserID              uint      `gorm:"not null;index" json:"user_id"`
	RedirectURI         string    `gorm:"size:500;not null" json:"redirect_uri"`
	Scopes              string    `gorm:"type:text" json:"scopes"`
	CodeChallenge       string    `gorm:"size:128" json:"code_challenge"` // PKCE支持
	CodeChallengeMethod string    `gorm:"size:16" json:"code_challenge_method"`
	ExpiresAt           time.Time `gorm:"not null" json:"expires_at"`
	Used                bool      `gorm:"default:false" json:"used"`

	// 关联
	Client OAuthClient `gorm:"foreignKey:ClientID;references:ClientID" json:"client,omitempty"`
	User   User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// IsExpired 检查授权码是否过期
func (c *OAuthAuthorizationCode) IsExpired() bool {
	return time.Now().After(c.ExpiresAt)
}

// OAuthAccessToken 表示OAuth2访问令牌
type OAuthAccessToken struct {
	gorm.Model
	Token        string    `gorm:"size:128;uniqueIndex;not null" json:"token"`
	ClientID     string    `gorm:"size:64;not null;index" json:"client_id"`
	UserID       uint      `gorm:"not null;index" json:"user_id"`
	Scopes       string    `gorm:"type:text" json:"scopes"`
	ExpiresAt    time.Time `gorm:"not null" json:"expires_at"`
	RefreshToken string    `gorm:"size:128;index" json:"refresh_token"`

	// 关联
	Client OAuthClient `gorm:"foreignKey:ClientID;references:ClientID" json:"client,omitempty"`
	User   User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// IsExpired 检查访问令牌是否过期
func (t *OAuthAccessToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// GetScopeList 获取权限范围列表
func (t *OAuthAccessToken) GetScopeList() []string {
	if t.Scopes == "" {
		return []string{}
	}
	return strings.Split(t.Scopes, ",")
}
