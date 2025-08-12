package oauth

import (
	"basaltpass-backend/internal/service/aduit"
	"errors"
	"strings"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// ClientService OAuth2客户端管理服务
type ClientService struct {
	db *gorm.DB
}

// NewClientService 创建新的客户端服务
func NewClientService() *ClientService {
	return &ClientService{
		db: common.DB(),
	}
}

// CreateClientRequest 创建客户端请求
type CreateClientRequest struct {
	Name           string   `json:"name" validate:"required,min=1,max=100"`
	Description    string   `json:"description" validate:"max=500"`
	RedirectURIs   []string `json:"redirect_uris" validate:"required,min=1"`
	Scopes         []string `json:"scopes"`
	AllowedOrigins []string `json:"allowed_origins"`
}

// UpdateClientRequest 更新客户端请求
type UpdateClientRequest struct {
	Name           string   `json:"name" validate:"omitempty,min=1,max=100"`
	Description    string   `json:"description" validate:"omitempty,max=500"`
	RedirectURIs   []string `json:"redirect_uris" validate:"omitempty,min=1"`
	Scopes         []string `json:"scopes"`
	AllowedOrigins []string `json:"allowed_origins"`
	IsActive       *bool    `json:"is_active"`
}

// ClientResponse 客户端响应
type ClientResponse struct {
	ID             uint      `json:"id"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	ClientID       string    `json:"client_id"`
	ClientSecret   string    `json:"client_secret,omitempty"` // 只在创建时返回
	RedirectURIs   []string  `json:"redirect_uris"`
	Scopes         []string  `json:"scopes"`
	AllowedOrigins []string  `json:"allowed_origins"`
	IsActive       bool      `json:"is_active"`
	LastUsedAt     *string   `json:"last_used_at"`
	CreatedBy      uint      `json:"created_by"`
	CreatedAt      string    `json:"created_at"`
	UpdatedAt      string    `json:"updated_at"`
	Creator        *UserInfo `json:"creator,omitempty"`
	App            *AppInfo  `json:"app,omitempty"`
}

// UserInfo 用户信息
type UserInfo struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
}

type AppInfo struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

// CreateClient 创建OAuth2客户端
func (s *ClientService) CreateClient(creatorID uint, req *CreateClientRequest) (*ClientResponse, error) {
	// 验证请求
	if err := s.validateCreateRequest(req); err != nil {
		return nil, err
	}

	// 创建客户端
	client := &model.OAuthClient{
		CreatedBy: creatorID,
		IsActive:  true,
	}

	// 生成客户端凭证
	if err := client.GenerateClientCredentials(); err != nil {
		return nil, err
	}

	// 设置重定向URI、权限范围和允许的源
	client.SetRedirectURIList(req.RedirectURIs)
	if len(req.Scopes) > 0 {
		client.SetScopeList(req.Scopes)
	} else {
		// 默认权限范围
		client.SetScopeList([]string{"openid", "profile", "email"})
	}

	if len(req.AllowedOrigins) > 0 {
		client.AllowedOrigins = strings.Join(req.AllowedOrigins, ",")
	}

	// 哈希客户端密钥
	plainSecret := client.ClientSecret
	client.HashClientSecret()

	// 保存到数据库
	if err := s.db.Create(client).Error; err != nil {
		return nil, err
	}

	// 记录审计日志
	aduit.LogAudit(creatorID, "创建OAuth2客户端", "oauth_client", client.ClientID, "", "")

	// 加载创建者信息
	if err := s.db.Preload("Creator").First(client, client.ID).Error; err != nil {
		return nil, err
	}

	return s.clientToResponse(client, plainSecret), nil
}

// CreateClientForApp 为指定应用创建OAuth客户端
func (s *ClientService) CreateClientForApp(appID, creatorID uint, req *CreateClientRequest) (*ClientResponse, error) {
	// 验证应用存在
	var app model.App
	if err := s.db.First(&app, appID).Error; err != nil {
		return nil, errors.New("应用不存在")
	}

	// 验证请求
	if err := s.validateCreateRequest(req); err != nil {
		return nil, err
	}

	// 创建OAuth客户端
	client := &model.OAuthClient{
		AppID:     appID,
		IsActive:  true,
		CreatedBy: creatorID,
	}

	// 生成客户端凭证
	if err := client.GenerateClientCredentials(); err != nil {
		return nil, err
	}

	// 设置重定向URI和权限范围
	client.SetRedirectURIList(req.RedirectURIs)
	if len(req.Scopes) > 0 {
		client.SetScopeList(req.Scopes)
	} else {
		client.SetScopeList([]string{"openid", "profile", "email"})
	}

	if len(req.AllowedOrigins) > 0 {
		client.SetAllowedOriginList(req.AllowedOrigins)
	}

	// 哈希客户端密钥
	plainSecret := client.ClientSecret
	client.HashClientSecret()

	// 保存到数据库
	if err := s.db.Create(client).Error; err != nil {
		return nil, err
	}

	// 记录审计日志
	aduit.LogAudit(creatorID, "为应用创建OAuth2客户端", "oauth_client", client.ClientID, "", "")

	// 返回响应（包含明文密钥）
	return s.clientToResponse(client, plainSecret), nil
}

// GetClient 获取客户端详情
func (s *ClientService) GetClient(clientID string) (*ClientResponse, error) {
	var client model.OAuthClient
	if err := s.db.Preload("Creator").Where("client_id = ?", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("客户端不存在")
		}
		return nil, err
	}

	return s.clientToResponse(&client, ""), nil
}

// ListClients 获取客户端列表
func (s *ClientService) ListClients(page, pageSize int, search string) ([]*ClientResponse, int64, error) {
	query := s.db.Model(&model.OAuthClient{}).Preload("App").Preload("Creator")

	// 搜索
	if search != "" {
		query = query.Where("client_id LIKE ?", "%"+search+"%")
	}

	// 获取总数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	var clients []model.OAuthClient
	if err := query.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&clients).Error; err != nil {
		return nil, 0, err
	}

	// 转换为响应格式
	responses := make([]*ClientResponse, len(clients))
	for i, client := range clients {
		responses[i] = s.clientToResponse(&client, "")
	}

	return responses, total, nil
}

// UpdateClient 更新客户端
func (s *ClientService) UpdateClient(clientID string, req *UpdateClientRequest) (*ClientResponse, error) {
	// 查找客户端
	var client model.OAuthClient
	if err := s.db.Where("client_id = ?", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("客户端不存在")
		}
		return nil, err
	}

	// 验证请求
	if err := s.validateUpdateRequest(req); err != nil {
		return nil, err
	}

	// 更新字段
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if len(req.RedirectURIs) > 0 {
		client.SetRedirectURIList(req.RedirectURIs)
		updates["redirect_uris"] = client.RedirectURIs
	}
	if len(req.Scopes) > 0 {
		client.SetScopeList(req.Scopes)
		updates["scopes"] = client.Scopes
	}
	if len(req.AllowedOrigins) > 0 {
		updates["allowed_origins"] = strings.Join(req.AllowedOrigins, ",")
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	// 更新数据库
	if err := s.db.Model(&client).Updates(updates).Error; err != nil {
		return nil, err
	}

	// 记录审计日志
	aduit.LogAudit(0, "更新OAuth2客户端", "oauth_client", clientID, "", "")

	// 重新加载数据
	if err := s.db.Preload("Creator").First(&client, client.ID).Error; err != nil {
		return nil, err
	}

	return s.clientToResponse(&client, ""), nil
}

// DeleteClient 删除客户端
func (s *ClientService) DeleteClient(clientID string) error {
	// 查找客户端
	var client model.OAuthClient
	if err := s.db.Where("client_id = ?", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("客户端不存在")
		}
		return err
	}

	// 删除相关的授权码和访问令牌
	s.db.Where("client_id = ?", clientID).Delete(&model.OAuthAuthorizationCode{})
	s.db.Where("client_id = ?", clientID).Delete(&model.OAuthAccessToken{})

	// 删除客户端
	if err := s.db.Delete(&client).Error; err != nil {
		return err
	}

	// 记录审计日志
	aduit.LogAudit(0, "删除OAuth2客户端", "oauth_client", clientID, "", "")

	return nil
}

// RegenerateSecret 重新生成客户端密钥
func (s *ClientService) RegenerateSecret(clientID string) (string, error) {
	// 查找客户端
	var client model.OAuthClient
	if err := s.db.Where("client_id = ?", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("客户端不存在")
		}
		return "", err
	}

	// 生成新密钥
	if err := client.GenerateClientCredentials(); err != nil {
		return "", err
	}

	plainSecret := client.ClientSecret
	client.HashClientSecret()

	// 保持原始的ClientID
	client.ClientID = clientID

	// 更新数据库
	if err := s.db.Model(&client).Updates(map[string]interface{}{
		"client_secret": client.ClientSecret,
	}).Error; err != nil {
		return "", err
	}

	// 撤销所有现有的访问令牌
	s.db.Where("client_id = ?", clientID).Delete(&model.OAuthAccessToken{})

	// 记录审计日志
	aduit.LogAudit(0, "重新生成OAuth2客户端密钥", "oauth_client", clientID, "", "")

	return plainSecret, nil
}

// GetClientStats 获取客户端统计信息
func (s *ClientService) GetClientStats(clientID string) (map[string]interface{}, error) {
	var stats map[string]interface{} = make(map[string]interface{})

	// 总授权数
	var totalAuthorizations int64
	s.db.Model(&model.OAuthAuthorizationCode{}).Where("client_id = ?", clientID).Count(&totalAuthorizations)
	stats["total_authorizations"] = totalAuthorizations

	// 活跃令牌数
	var activeTokens int64
	s.db.Model(&model.OAuthAccessToken{}).Where("client_id = ? AND expires_at > NOW()", clientID).Count(&activeTokens)
	stats["active_tokens"] = activeTokens

	// 总用户数
	var totalUsers int64
	s.db.Model(&model.OAuthAccessToken{}).
		Where("client_id = ?", clientID).
		Distinct("user_id").
		Count(&totalUsers)
	stats["total_users"] = totalUsers

	return stats, nil
}

// RevokeClientTokens 撤销客户端的所有令牌
func (s *ClientService) RevokeClientTokens(clientID string) error {
	// 删除所有相关的访问令牌和刷新令牌
	if err := s.db.Where("client_id = ?", clientID).Delete(&model.OAuthAccessToken{}).Error; err != nil {
		return err
	}

	if err := s.db.Where("client_id = ?", clientID).Delete(&model.OAuthRefreshToken{}).Error; err != nil {
		return err
	}

	// 记录审计日志
	aduit.LogAudit(0, "撤销OAuth2客户端所有令牌", "oauth_client", clientID, "", "")

	return nil
}

// ClientBelongsToTenant 检查客户端是否属于指定租户
func (s *ClientService) ClientBelongsToTenant(clientID string, tenantID uint) bool {
	var count int64
	s.db.Table("o_auth_clients").
		Joins("JOIN apps ON o_auth_clients.app_id = apps.id").
		Where("o_auth_clients.client_id = ? AND apps.tenant_id = ?", clientID, tenantID).
		Count(&count)
	return count > 0
}

// 验证函数
func (s *ClientService) validateCreateRequest(req *CreateClientRequest) error {
	if req.Name == "" {
		return errors.New("应用名称不能为空")
	}
	if len(req.RedirectURIs) == 0 {
		return errors.New("至少需要一个重定向URI")
	}
	for _, uri := range req.RedirectURIs {
		if !isValidURL(uri) {
			return errors.New("无效的重定向URI: " + uri)
		}
	}
	return nil
}

func (s *ClientService) validateUpdateRequest(req *UpdateClientRequest) error {
	if req.Name != "" && len(req.Name) == 0 {
		return errors.New("应用名称不能为空")
	}
	if len(req.RedirectURIs) > 0 {
		for _, uri := range req.RedirectURIs {
			if !isValidURL(uri) {
				return errors.New("无效的重定向URI: " + uri)
			}
		}
	}
	return nil
}

func isValidURL(urlStr string) bool {
	return strings.HasPrefix(urlStr, "http://") || strings.HasPrefix(urlStr, "https://")
}

// 转换函数
func (s *ClientService) clientToResponse(client *model.OAuthClient, plainSecret string) *ClientResponse {
	resp := &ClientResponse{
		ID:             client.ID,
		Name:           client.App.Name,
		Description:    client.App.Description,
		ClientID:       client.ClientID,
		RedirectURIs:   client.GetRedirectURIList(),
		Scopes:         client.GetScopeList(),
		AllowedOrigins: client.GetAllowedOriginList(),
		IsActive:       client.IsActive,
		CreatedBy:      client.CreatedBy,
		CreatedAt:      client.CreatedAt.Format(time.RFC3339),
		UpdatedAt:      client.UpdatedAt.Format(time.RFC3339),
	}

	if plainSecret != "" {
		resp.ClientSecret = plainSecret
	}

	if client.LastUsedAt != nil {
		lastUsed := client.LastUsedAt.Format(time.RFC3339)
		resp.LastUsedAt = &lastUsed
	}

	if client.Creator.ID > 0 {
		resp.Creator = &UserInfo{
			ID:       client.Creator.ID,
			Email:    client.Creator.Email,
			Nickname: client.Creator.Nickname,
		}
	}

	return resp
}
