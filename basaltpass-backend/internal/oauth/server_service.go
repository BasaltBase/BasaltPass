package oauth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// OAuthServerService OAuth2授权服务器服务
type OAuthServerService struct {
	db *gorm.DB
}

// NewOAuthServerService 创建新的OAuth2服务器服务
func NewOAuthServerService() *OAuthServerService {
	return &OAuthServerService{
		db: common.DB(),
	}
}

// AuthorizeRequest 授权请求结构
type AuthorizeRequest struct {
	ClientID            string `form:"client_id" binding:"required"`
	RedirectURI         string `form:"redirect_uri" binding:"required"`
	ResponseType        string `form:"response_type" binding:"required"`
	Scope               string `form:"scope"`
	State               string `form:"state"`
	CodeChallenge       string `form:"code_challenge"`        // PKCE
	CodeChallengeMethod string `form:"code_challenge_method"` // PKCE
}

// TokenRequest 令牌请求结构
type TokenRequest struct {
	GrantType    string `form:"grant_type" binding:"required"`
	Code         string `form:"code"`
	RedirectURI  string `form:"redirect_uri"`
	ClientID     string `form:"client_id"`
	CodeVerifier string `form:"code_verifier"` // PKCE
}

// TokenResponse 令牌响应结构
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token,omitempty"`
	Scope        string `json:"scope,omitempty"`
}

// AuthorizeResponse 授权响应结构
type AuthorizeResponse struct {
	Code  string `json:"code"`
	State string `json:"state,omitempty"`
}

// ValidateAuthorizeRequest 验证授权请求
func (s *OAuthServerService) ValidateAuthorizeRequest(req *AuthorizeRequest) (*model.OAuthClient, error) {
	// 1. 验证response_type
	if req.ResponseType != "code" {
		return nil, errors.New("unsupported_response_type")
	}

	// 2. 查找并验证客户端
	var client model.OAuthClient
	if err := s.db.Where("client_id = ? AND is_active = ?", req.ClientID, true).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid_client")
		}
		return nil, err
	}

	// 3. 验证redirect_uri
	if !client.ValidateRedirectURI(req.RedirectURI) {
		return nil, errors.New("invalid_redirect_uri")
	}

	// 4. 验证scope（可选）
	if req.Scope != "" {
		requestedScopes := strings.Split(req.Scope, " ")
		allowedScopes := client.GetScopeList()

		for _, reqScope := range requestedScopes {
			found := false
			for _, allowedScope := range allowedScopes {
				if strings.TrimSpace(reqScope) == strings.TrimSpace(allowedScope) {
					found = true
					break
				}
			}
			if !found {
				return nil, errors.New("invalid_scope")
			}
		}
	}

	return &client, nil
}

// GenerateAuthorizationCode 生成授权码
func (s *OAuthServerService) GenerateAuthorizationCode(userID uint, req *AuthorizeRequest) (string, error) {
	// 生成授权码
	codeBytes := make([]byte, 32)
	if _, err := rand.Read(codeBytes); err != nil {
		return "", err
	}
	code := hex.EncodeToString(codeBytes)

	// 创建授权码记录
	authCode := &model.OAuthAuthorizationCode{
		Code:                code,
		ClientID:            req.ClientID,
		UserID:              userID,
		RedirectURI:         req.RedirectURI,
		Scopes:              req.Scope,
		CodeChallenge:       req.CodeChallenge,
		CodeChallengeMethod: req.CodeChallengeMethod,
		ExpiresAt:           time.Now().Add(10 * time.Minute), // 授权码10分钟有效期
		Used:                false,
	}

	if err := s.db.Create(authCode).Error; err != nil {
		return "", err
	}

	return code, nil
}

// ExchangeCodeForToken 用授权码换取访问令牌
func (s *OAuthServerService) ExchangeCodeForToken(req *TokenRequest, clientSecret string) (*TokenResponse, error) {
	// 1. 验证grant_type
	if req.GrantType != "authorization_code" {
		return nil, errors.New("unsupported_grant_type")
	}

	// 2. 查找授权码
	var authCode model.OAuthAuthorizationCode
	if err := s.db.Where("code = ? AND used = ?", req.Code, false).First(&authCode).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid_grant")
		}
		return nil, err
	}

	// 3. 检查授权码是否过期
	if authCode.IsExpired() {
		return nil, errors.New("invalid_grant")
	}

	// 4. 验证客户端
	var client model.OAuthClient
	if err := s.db.Where("client_id = ?", authCode.ClientID).First(&client).Error; err != nil {
		return nil, errors.New("invalid_client")
	}

	// 5. 验证客户端密钥
	if !client.VerifyClientSecret(clientSecret) {
		return nil, errors.New("invalid_client")
	}

	// 6. 验证redirect_uri
	if req.RedirectURI != authCode.RedirectURI {
		return nil, errors.New("invalid_grant")
	}

	// 7. PKCE验证（如果使用）
	if authCode.CodeChallenge != "" {
		if req.CodeVerifier == "" {
			return nil, errors.New("invalid_request")
		}

		var challenge string
		switch authCode.CodeChallengeMethod {
		case "S256", "":
			hash := sha256.Sum256([]byte(req.CodeVerifier))
			challenge = strings.TrimRight(
				strings.ReplaceAll(
					strings.ReplaceAll(hex.EncodeToString(hash[:]), "+", "-"),
					"/", "_"),
				"=")
		case "plain":
			challenge = req.CodeVerifier
		default:
			return nil, errors.New("invalid_request")
		}

		if challenge != authCode.CodeChallenge {
			return nil, errors.New("invalid_grant")
		}
	}

	// 8. 生成访问令牌
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	accessToken := hex.EncodeToString(tokenBytes)

	// 9. 生成刷新令牌
	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		return nil, err
	}
	refreshToken := hex.EncodeToString(refreshTokenBytes)

	// 10. 保存访问令牌
	oauthToken := &model.OAuthAccessToken{
		Token:        accessToken,
		ClientID:     authCode.ClientID,
		UserID:       authCode.UserID,
		Scopes:       authCode.Scopes,
		ExpiresAt:    time.Now().Add(1 * time.Hour), // 访问令牌1小时有效期
		RefreshToken: refreshToken,
	}

	if err := s.db.Create(oauthToken).Error; err != nil {
		return nil, err
	}

	// 11. 标记授权码为已使用
	if err := s.db.Model(&authCode).Update("used", true).Error; err != nil {
		return nil, err
	}

	// 12. 更新客户端最后使用时间
	now := time.Now()
	s.db.Model(&client).Update("last_used_at", &now)

	return &TokenResponse{
		AccessToken:  accessToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600, // 1小时
		RefreshToken: refreshToken,
		Scope:        authCode.Scopes,
	}, nil
}

// RefreshAccessToken 刷新访问令牌
func (s *OAuthServerService) RefreshAccessToken(refreshToken string, clientID string, clientSecret string) (*TokenResponse, error) {
	// 1. 查找访问令牌
	var token model.OAuthAccessToken
	if err := s.db.Where("refresh_token = ? AND client_id = ?", refreshToken, clientID).First(&token).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid_grant")
		}
		return nil, err
	}

	// 2. 验证客户端
	var client model.OAuthClient
	if err := s.db.Where("client_id = ?", clientID).First(&client).Error; err != nil {
		return nil, errors.New("invalid_client")
	}

	if !client.VerifyClientSecret(clientSecret) {
		return nil, errors.New("invalid_client")
	}

	// 3. 生成新的访问令牌
	tokenBytes := make([]byte, 32)
	if _, err := rand.Read(tokenBytes); err != nil {
		return nil, err
	}
	newAccessToken := hex.EncodeToString(tokenBytes)

	// 4. 生成新的刷新令牌
	refreshTokenBytes := make([]byte, 32)
	if _, err := rand.Read(refreshTokenBytes); err != nil {
		return nil, err
	}
	newRefreshToken := hex.EncodeToString(refreshTokenBytes)

	// 5. 更新令牌
	token.Token = newAccessToken
	token.RefreshToken = newRefreshToken
	token.ExpiresAt = time.Now().Add(1 * time.Hour)

	if err := s.db.Save(&token).Error; err != nil {
		return nil, err
	}

	return &TokenResponse{
		AccessToken:  newAccessToken,
		TokenType:    "Bearer",
		ExpiresIn:    3600,
		RefreshToken: newRefreshToken,
		Scope:        token.Scopes,
	}, nil
}

// ValidateAccessToken 验证访问令牌
func (s *OAuthServerService) ValidateAccessToken(token string) (*model.OAuthAccessToken, error) {
	var oauthToken model.OAuthAccessToken
	if err := s.db.Preload("User").Preload("Client").Where("token = ?", token).First(&oauthToken).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid_token")
		}
		return nil, err
	}

	if oauthToken.IsExpired() {
		return nil, errors.New("token_expired")
	}

	return &oauthToken, nil
}

// GetUserInfo 获取用户信息（OpenID Connect）
func (s *OAuthServerService) GetUserInfo(token string) (*UserInfoResponse, error) {
	oauthToken, err := s.ValidateAccessToken(token)
	if err != nil {
		return nil, err
	}

	// 检查scope是否包含openid或profile
	scopes := oauthToken.GetScopeList()
	hasProfileScope := false
	for _, scope := range scopes {
		if scope == "openid" || scope == "profile" {
			hasProfileScope = true
			break
		}
	}

	if !hasProfileScope {
		return nil, errors.New("insufficient_scope")
	}

	user := oauthToken.User
	response := &UserInfoResponse{
		Sub:           fmt.Sprintf("%d", user.ID),
		Name:          user.Nickname,
		Email:         user.Email,
		EmailVerified: user.EmailVerified,
		Phone:         user.Phone,
		PhoneVerified: user.PhoneVerified,
		Picture:       user.AvatarURL,
		UpdatedAt:     user.UpdatedAt.Unix(),
	}

	return response, nil
}

// UserInfoResponse 用户信息响应（OpenID Connect标准）
type UserInfoResponse struct {
	Sub           string `json:"sub"`                    // 用户唯一标识
	Name          string `json:"name,omitempty"`         // 用户姓名
	Email         string `json:"email,omitempty"`        // 邮箱
	EmailVerified bool   `json:"email_verified"`         // 邮箱是否验证
	Phone         string `json:"phone_number,omitempty"` // 手机号
	PhoneVerified bool   `json:"phone_number_verified"`  // 手机号是否验证
	Picture       string `json:"picture,omitempty"`      // 头像
	UpdatedAt     int64  `json:"updated_at"`             // 更新时间
}

// BuildAuthorizeURL 构建授权URL
func (s *OAuthServerService) BuildAuthorizeURL(baseURL string, req *AuthorizeRequest) (string, error) {
	u, err := url.Parse(baseURL)
	if err != nil {
		return "", err
	}

	q := u.Query()
	q.Set("client_id", req.ClientID)
	q.Set("redirect_uri", req.RedirectURI)
	q.Set("response_type", req.ResponseType)
	if req.Scope != "" {
		q.Set("scope", req.Scope)
	}
	if req.State != "" {
		q.Set("state", req.State)
	}
	if req.CodeChallenge != "" {
		q.Set("code_challenge", req.CodeChallenge)
		q.Set("code_challenge_method", req.CodeChallengeMethod)
	}

	u.RawQuery = q.Encode()
	return u.String(), nil
}

// RevokeToken 撤销令牌
func (s *OAuthServerService) RevokeToken(token string) error {
	return s.db.Where("token = ? OR refresh_token = ?", token, token).Delete(&model.OAuthAccessToken{}).Error
}
