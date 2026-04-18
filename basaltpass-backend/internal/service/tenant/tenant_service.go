package tenant

import (
	"basaltpass-backend/internal/service/aduit"
	"errors"
	"fmt"
	"strings"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// TenantService 租户管理服务
type TenantService struct {
	db *gorm.DB
}

// NewTenantService 创建租户服务实例
func NewTenantService() *TenantService {
	return &TenantService{
		db: common.DB(),
	}
}

// CreateTenantRequest 创建租户请求
type CreateTenantRequest struct {
	Name     string                 `json:"name" validate:"required,min=1,max=128"`
	Metadata map[string]interface{} `json:"metadata"`
}

// UpdateTenantRequest 更新租户请求
type UpdateTenantRequest struct {
	Name     string                 `json:"name" validate:"omitempty,min=1,max=128"`
	Metadata map[string]interface{} `json:"metadata"`
}

// TenantResponse 租户响应
type TenantResponse struct {
	ID        uint                   `json:"id"`
	Name      string                 `json:"name"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt string                 `json:"created_at"`
	UpdatedAt string                 `json:"updated_at"`

	// 统计信息
	Stats *TenantStats `json:"stats,omitempty"`
}

// TenantStats 租户统计信息
type TenantStats struct {
	TotalUsers int64 `json:"total_users"`
	TotalApps  int64 `json:"total_apps"`
	ActiveApps int64 `json:"active_apps"`
}

// TenantInfo 租户基础信息（控制台专用）
type TenantInfo struct {
	ID          uint               `json:"id"`
	Name        string             `json:"name"`
	Code        string             `json:"code"`
	Description string             `json:"description"`
	Status      model.TenantStatus `json:"status"`
	CreatedAt   string             `json:"created_at"`
	UpdatedAt   string             `json:"updated_at"`

	// 统计信息
	Stats TenantDetailStats `json:"stats"`

	// 配额信息
	Quota *TenantQuotaInfo `json:"quota,omitempty"`

	// 支付配置
	StripeConfig *TenantStripeConfigResponse `json:"stripe_config,omitempty"`
}

// TenantStripeConfigResponse 租户 Stripe 配置响应（脱敏）
type TenantStripeConfigResponse struct {
	Enabled             bool   `json:"enabled"`
	PublishableKey      string `json:"publishable_key"`
	HasSecretKey        bool   `json:"has_secret_key"`
	SecretKeyMasked     string `json:"secret_key_masked,omitempty"`
	HasWebhookSecret    bool   `json:"has_webhook_secret"`
	WebhookSecretMasked string `json:"webhook_secret_masked,omitempty"`
}

// UpdateTenantStripeConfigRequest 更新租户 Stripe 配置请求
type UpdateTenantStripeConfigRequest struct {
	Enabled            *bool   `json:"enabled"`
	PublishableKey     *string `json:"publishable_key"`
	SecretKey          *string `json:"secret_key"`
	WebhookSecret      *string `json:"webhook_secret"`
	ClearSecretKey     bool    `json:"clear_secret_key"`
	ClearWebhookSecret bool    `json:"clear_webhook_secret"`
}

// TenantDetailStats 详细统计信息
type TenantDetailStats struct {
	TotalUsers   int64 `json:"total_users"`
	TotalApps    int64 `json:"total_apps"`
	ActiveApps   int64 `json:"active_apps"`
	TotalClients int64 `json:"total_clients"` // OAuth客户端数量
	ActiveTokens int64 `json:"active_tokens"` // 活跃token数量
}

// TenantQuotaInfo 配额信息
type TenantQuotaInfo struct {
	MaxApps          int `json:"max_apps"`
	MaxUsers         int `json:"max_users"`
	MaxTokensPerHour int `json:"max_tokens_per_hour"`
}

// CreateTenant 创建租户
func (s *TenantService) CreateTenant(ownerUserID uint, req *CreateTenantRequest) (*TenantResponse, error) {
	// 检查租户名称是否已存在
	var existingTenant model.Tenant
	if err := s.db.Where("name = ?", req.Name).First(&existingTenant).Error; err == nil {
		return nil, errors.New("租户名称已存在")
	}

	// 创建租户
	tenant := &model.Tenant{
		Name:     req.Name,
		Metadata: model.JSONMap(req.Metadata),
	}

	// 开始事务
	tx := s.db.Begin()

	if err := tx.Create(tenant).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 创建租户配额
	quota := &model.TenantQuota{
		TenantID: tenant.ID,
	}

	quota.MaxApps = 5
	quota.MaxUsers = 100
	quota.MaxTokensPerHour = 1000

	if err := tx.Create(quota).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	authSetting := &model.TenantAuthSetting{
		TenantID:          tenant.ID,
		AllowRegistration: true,
		AllowLogin:        true,
	}
	if err := tx.Create(authSetting).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 添加创建者为租户所有者
	tenantUser := &model.TenantUser{
		UserID:   ownerUserID,
		TenantID: tenant.ID,
		Role:     model.TenantRoleOwner,
	}

	if err := tx.Create(tenantUser).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 将用户主租户切换到新创建的 tenant
	if err := tx.Model(&model.User{}).
		Where("id = ?", ownerUserID).
		Update("tenant_id", tenant.ID).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 初始化租户 RBAC 默认权限、角色，并将创建者绑定为 owner 角色
	if err := EnsureTenantRBACBootstrap(tx, tenant.ID, ownerUserID); err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()

	// 审计日志
	aduit.LogAudit(ownerUserID, "创建租户", "tenant", fmt.Sprint(tenant.ID), "", "")

	return s.tenantToResponse(tenant, nil), nil
}

// GetTenant 获取租户详情
func (s *TenantService) GetTenant(tenantID uint, includeStats bool) (*TenantResponse, error) {
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	var stats *TenantStats
	if includeStats {
		stats = s.getTenantStats(tenantID)
	}

	return s.tenantToResponse(&tenant, stats), nil
}

// GetTenantInfo 获取租户基础信息（控制台专用）
func (s *TenantService) GetTenantInfo(tenantID uint) (*TenantInfo, error) {
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	// 获取详细统计信息
	stats := s.getTenantDetailStats(tenantID)

	// 获取配额信息
	quota := s.getTenantQuota(tenantID)

	info := &TenantInfo{
		ID:           tenant.ID,
		Name:         tenant.Name,
		Code:         tenant.Code,
		Description:  tenant.Description,
		Status:       tenant.Status,
		CreatedAt:    tenant.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:    tenant.UpdatedAt.Format("2006-01-02 15:04:05"),
		Stats:        *stats,
		Quota:        quota,
		StripeConfig: s.buildTenantStripeConfigResponse(tenant.Metadata),
	}

	return info, nil
}

// GetTenantStripeConfig 获取租户 Stripe 配置（脱敏）
func (s *TenantService) GetTenantStripeConfig(tenantID uint) (*TenantStripeConfigResponse, error) {
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	return s.buildTenantStripeConfigResponse(tenant.Metadata), nil
}

// UpdateTenantStripeConfig 更新租户 Stripe 配置
func (s *TenantService) UpdateTenantStripeConfig(tenantID uint, req *UpdateTenantStripeConfigRequest) (*TenantStripeConfigResponse, error) {
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	metadata := map[string]interface{}(tenant.Metadata)
	if metadata == nil {
		metadata = make(map[string]interface{})
	}

	stripeMap := map[string]interface{}{}
	if raw, ok := metadata["stripe"]; ok {
		if existing, ok := raw.(map[string]interface{}); ok {
			for k, v := range existing {
				stripeMap[k] = v
			}
		}
	}

	if req.Enabled != nil {
		stripeMap["enabled"] = *req.Enabled
	}

	if req.PublishableKey != nil {
		publishableKey := strings.TrimSpace(*req.PublishableKey)
		if publishableKey != "" && !strings.HasPrefix(publishableKey, "pk_") {
			return nil, errors.New("Stripe publishable key 必须以 pk_ 开头")
		}
		stripeMap["publishable_key"] = publishableKey
	}

	if req.SecretKey != nil {
		secretKey := strings.TrimSpace(*req.SecretKey)
		if secretKey != "" {
			if !strings.HasPrefix(secretKey, "sk_") {
				return nil, errors.New("Stripe secret key 必须以 sk_ 开头")
			}
			stripeMap["secret_key"] = secretKey
		}
	}

	if req.WebhookSecret != nil {
		stripeMap["webhook_secret"] = strings.TrimSpace(*req.WebhookSecret)
	}

	if req.ClearSecretKey {
		delete(stripeMap, "secret_key")
	}

	if req.ClearWebhookSecret {
		delete(stripeMap, "webhook_secret")
	}

	enabled, _ := stripeMap["enabled"].(bool)
	publishableKey, _ := stripeMap["publishable_key"].(string)
	secretKey, _ := stripeMap["secret_key"].(string)

	if enabled {
		if strings.TrimSpace(publishableKey) == "" {
			return nil, errors.New("启用 Stripe 前请先配置 publishable key")
		}
		if strings.TrimSpace(secretKey) == "" {
			return nil, errors.New("启用 Stripe 前请先配置 secret key")
		}
	}

	metadata["stripe"] = stripeMap

	if err := s.db.Model(&tenant).Updates(map[string]interface{}{
		"metadata":   model.JSONMap(metadata),
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, err
	}

	tenant.Metadata = model.JSONMap(metadata)
	return s.buildTenantStripeConfigResponse(tenant.Metadata), nil
}

// ListTenants 获取租户列表（超级管理员）
func (s *TenantService) ListTenants(page, pageSize int, search string) ([]*TenantResponse, int64, error) {
	var tenants []model.Tenant
	var total int64

	query := s.db.Model(&model.Tenant{})
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 查询数据
	offset := (page - 1) * pageSize
	if err := query.Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&tenants).Error; err != nil {
		return nil, 0, err
	}

	// 转换响应
	responses := make([]*TenantResponse, len(tenants))
	for i, tenant := range tenants {
		responses[i] = s.tenantToResponse(&tenant, nil)
	}

	return responses, total, nil
}

// GetUserTenants 获取用户的租户列表
func (s *TenantService) GetUserTenants(userID uint) ([]*TenantResponse, error) {
	var user model.User
	if err := s.db.Select("tenant_id").First(&user, userID).Error; err != nil {
		return nil, err
	}
	if user.TenantID == 0 {
		return []*TenantResponse{}, nil
	}

	var tenant model.Tenant
	if err := s.db.First(&tenant, user.TenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []*TenantResponse{}, nil
		}
		return nil, err
	}

	resp := s.tenantToResponse(&tenant, nil)
	if resp.Metadata == nil {
		resp.Metadata = make(map[string]interface{})
	}

	var tenantUser model.TenantUser
	if err := s.db.Where("user_id = ? AND tenant_id = ?", userID, user.TenantID).First(&tenantUser).Error; err == nil {
		resp.Metadata["user_role"] = string(tenantUser.Role)
	} else {
		resp.Metadata["user_role"] = string(model.TenantRoleUser)
	}

	return []*TenantResponse{resp}, nil
}

// UpdateTenant 更新租户
func (s *TenantService) UpdateTenant(tenantID uint, req *UpdateTenantRequest) (*TenantResponse, error) {
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	// 更新字段
	updates := make(map[string]interface{})
	if req.Name != "" {
		// 检查名称是否已存在
		var existingTenant model.Tenant
		if err := s.db.Where("name = ? AND id != ?", req.Name, tenantID).First(&existingTenant).Error; err == nil {
			return nil, errors.New("租户名称已存在")
		}
		updates["name"] = req.Name
	}
	if req.Metadata != nil {
		updates["metadata"] = model.JSONMap(req.Metadata)
	}

	if len(updates) > 0 {
		updates["updated_at"] = time.Now()
		if err := s.db.Model(&tenant).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// 重新查询返回
	return s.GetTenant(tenantID, false)
}

// DeleteTenant 删除租户
func (s *TenantService) DeleteTenant(tenantID uint) error {
	// 软删除租户
	if err := s.db.Delete(&model.Tenant{}, tenantID).Error; err != nil {
		return err
	}

	// 审计日志
	aduit.LogAudit(0, "删除租户", "tenant", fmt.Sprint(tenantID), "", "")

	return nil
}

// GetMemberRole 获取租户成员角色
func (s *TenantService) GetMemberRole(tenantID, userID uint) (model.TenantRole, error) {
	var tenantUser model.TenantUser
	if err := s.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&tenantUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("用户不在该租户中")
		}
		return "", err
	}

	return tenantUser.Role, nil
}

// InviteUserToTenant 邀请用户加入租户
func (s *TenantService) InviteUserToTenant(tenantID, inviterUserID, userID uint, role model.TenantRole) error {
	inviterRole, err := s.GetMemberRole(tenantID, inviterUserID)
	if err != nil {
		return errors.New("无权限邀请用户")
	}

	if inviterRole != model.TenantRoleOwner && inviterRole != model.TenantRoleAdmin {
		return errors.New("无权限邀请用户")
	}

	// 检查用户是否已在租户中
	var existingTA model.TenantUser
	if err := s.db.Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&existingTA).Error; err == nil {
		return errors.New("用户已在租户中")
	}

	// 创建租户管理员关联
	tenantUser := &model.TenantUser{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
	}

	if err := s.db.Create(tenantUser).Error; err != nil {
		return err
	}

	// 审计日志
	aduit.LogAudit(userID, "加入租户", "tenant", fmt.Sprint(tenantID), "", "")

	return nil
}

// 辅助方法

func (s *TenantService) tenantToResponse(tenant *model.Tenant, stats *TenantStats) *TenantResponse {
	resp := &TenantResponse{
		ID:        tenant.ID,
		Name:      tenant.Name,
		Metadata:  map[string]interface{}(tenant.Metadata),
		CreatedAt: tenant.CreatedAt.Format("2006-07-05 15:04:05"),
		UpdatedAt: tenant.UpdatedAt.Format("2006-07-05 15:04:05"),
		Stats:     stats,
	}

	return resp
}

func (s *TenantService) buildTenantStripeConfigResponse(metadata model.JSONMap) *TenantStripeConfigResponse {
	resp := &TenantStripeConfigResponse{}
	rawMeta := map[string]interface{}(metadata)
	if rawMeta == nil {
		return resp
	}

	rawStripe, ok := rawMeta["stripe"]
	if !ok {
		return resp
	}

	stripeMap, ok := rawStripe.(map[string]interface{})
	if !ok {
		return resp
	}

	resp.Enabled = toBool(stripeMap["enabled"])
	resp.PublishableKey = toString(stripeMap["publishable_key"])

	secret := toString(stripeMap["secret_key"])
	resp.HasSecretKey = secret != ""
	resp.SecretKeyMasked = maskKey(secret)

	webhookSecret := toString(stripeMap["webhook_secret"])
	resp.HasWebhookSecret = webhookSecret != ""
	resp.WebhookSecretMasked = maskKey(webhookSecret)

	return resp
}

func maskKey(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return ""
	}
	if len(v) <= 8 {
		return "****"
	}
	return v[:6] + "..." + v[len(v)-4:]
}

func toString(v interface{}) string {
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

func toBool(v interface{}) bool {
	b, _ := v.(bool)
	return b
}

func (s *TenantService) getTenantStats(tenantID uint) *TenantStats {
	stats := &TenantStats{}

	// 用户统计
	s.db.Model(&model.TenantUser{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalUsers)

	// 应用统计
	s.db.Model(&model.App{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalApps)
	s.db.Model(&model.App{}).Where("tenant_id = ? AND status = ?", tenantID, model.AppStatusActive).Count(&stats.ActiveApps)

	return stats
}

// getTenantDetailStats 获取租户详细统计信息
func (s *TenantService) getTenantDetailStats(tenantID uint) *TenantDetailStats {
	stats := &TenantDetailStats{}

	// 用户统计
	s.db.Model(&model.TenantUser{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalUsers)

	// 应用统计
	s.db.Model(&model.App{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalApps)
	s.db.Model(&model.App{}).Where("tenant_id = ? AND status = ?", tenantID, model.AppStatusActive).Count(&stats.ActiveApps)

	// OAuth客户端统计
	s.db.Model(&model.OAuthClient{}).
		Joins("JOIN apps ON apps.id = oauth_clients.app_id").
		Where("apps.tenant_id = ?", tenantID).
		Count(&stats.TotalClients)

	// 活跃token统计（最近24小时内有活动的token）
	s.db.Model(&model.OAuthAccessToken{}).
		Joins("JOIN oauth_clients ON oauth_clients.client_id = oauth_access_tokens.client_id").
		Joins("JOIN apps ON apps.id = oauth_clients.app_id").
		Where("apps.tenant_id = ? AND oauth_access_tokens.expires_at > NOW() AND oauth_access_tokens.created_at > NOW() - INTERVAL '24 hours'", tenantID).
		Count(&stats.ActiveTokens)

	return stats
}

// getTenantQuota 获取租户配额信息
func (s *TenantService) getTenantQuota(tenantID uint) *TenantQuotaInfo {
	var quota model.TenantQuota
	if err := s.db.Where("tenant_id = ?", tenantID).First(&quota).Error; err != nil {
		// 如果没有找到配额记录，返回默认值
		return &TenantQuotaInfo{
			MaxApps:          5,
			MaxUsers:         100,
			MaxTokensPerHour: 1000,
		}
	}

	return &TenantQuotaInfo{
		MaxApps:          quota.MaxApps,
		MaxUsers:         quota.MaxUsers,
		MaxTokensPerHour: quota.MaxTokensPerHour,
	}
}
