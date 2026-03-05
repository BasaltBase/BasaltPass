package model

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// OAuthClient 表示一个OAuth2客户端（业务应用）
type OAuthClient struct {
	gorm.Model
	AppID        uint   `gorm:"not null;index" json:"app_id"`                                           // 关联的应用ID
	ClientID     string `gorm:"size:64;uniqueIndex;not null" json:"client_id"`                          // 客户端ID
	ClientSecret string `gorm:"size:128;not null" json:"-"`                                             // 客户端密钥（不返回给前端）
	RedirectURIs string `gorm:"type:text;not null" json:"redirect_uris"`                                // 允许的重定向URI列表（用逗号分隔）
	Scopes       string `gorm:"type:text" json:"scopes"`                                                // 允许的权限范围（用逗号分隔）
	GrantTypes   string `gorm:"size:255;default:'authorization_code,refresh_token'" json:"grant_types"` // 支持的授权类型
	IsActive     bool   `gorm:"default:true" json:"is_active"`                                          // 是否激活

	// 应用配置
	AllowedOrigins string `gorm:"type:text" json:"allowed_origins"` // 允许的CORS源（用逗号分隔）

	// 统计信息
	LastUsedAt *time.Time `json:"last_used_at"`               // 最后使用时间
	CreatedBy  uint       `gorm:"not null" json:"created_by"` // 创建者用户ID
	RotatesAt  *time.Time `json:"rotates_at"`                 // 密钥轮换时间

	// 关联
	App     App  `gorm:"foreignKey:AppID" json:"app,omitempty"`
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

// GetAllowedOriginList 获取允许的CORS源列表
func (c *OAuthClient) GetAllowedOriginList() []string {
	if c.AllowedOrigins == "" {
		return []string{}
	}
	return strings.Split(c.AllowedOrigins, ",")
}

// SetAllowedOriginList 设置允许的CORS源列表
func (c *OAuthClient) SetAllowedOriginList(origins []string) {
	c.AllowedOrigins = strings.Join(origins, ",")
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

// HashClientSecret 对客户端密钥进行哈希处理，使用 bcrypt（cost=12）。
// 调用后 c.ClientSecret 变为 bcrypt hash，原始明文不再保存。
func (c *OAuthClient) HashClientSecret() {
	if c.ClientSecret == "" {
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(c.ClientSecret), 12)
	if err == nil {
		c.ClientSecret = string(hash)
	}
}

// VerifyClientSecret 验证客户端密钥。
// bcrypt hash 以 "$2" 开头；旧的 SHA-256 hex（64 字符）在迁移完成前仍可验证通过。
func (c *OAuthClient) VerifyClientSecret(secret string) bool {
	stored := c.ClientSecret
	if strings.HasPrefix(stored, "$2") {
		return bcrypt.CompareHashAndPassword([]byte(stored), []byte(secret)) == nil
	}
	// 向后兼容：旧 SHA-256 hex 格式
	legacy := sha256.Sum256([]byte(secret))
	return hex.EncodeToString(legacy[:]) == stored
}
