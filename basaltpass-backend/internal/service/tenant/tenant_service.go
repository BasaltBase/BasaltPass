package tenant

import (
	"basaltpass-backend/internal/service/aduit"
	"errors"
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
	Plan     model.TenantPlan       `json:"plan" validate:"required,oneof=free pro enterprise"`
	Metadata map[string]interface{} `json:"metadata"`
}

// UpdateTenantRequest 更新租户请求
type UpdateTenantRequest struct {
	Name     string                 `json:"name" validate:"omitempty,min=1,max=128"`
	Plan     *model.TenantPlan      `json:"plan" validate:"omitempty,oneof=free pro enterprise"`
	Metadata map[string]interface{} `json:"metadata"`
}

// TenantResponse 租户响应
type TenantResponse struct {
	ID        uint                   `json:"id"`
	Name      string                 `json:"name"`
	Plan      model.TenantPlan       `json:"plan"`
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
	Plan        model.TenantPlan   `json:"plan"`
	CreatedAt   string             `json:"created_at"`
	UpdatedAt   string             `json:"updated_at"`

	// 统计信息
	Stats TenantDetailStats `json:"stats"`

	// 配额信息
	Quota *TenantQuotaInfo `json:"quota,omitempty"`
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
		Plan:     req.Plan,
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

	// 根据计划设置配额
	switch req.Plan {
	case model.TenantPlanFree:
		quota.MaxApps = 3
		quota.MaxUsers = 50
		quota.MaxTokensPerHour = 1000
	case model.TenantPlanPro:
		quota.MaxApps = 10
		quota.MaxUsers = 500
		quota.MaxTokensPerHour = 10000
	case model.TenantPlanEnterprise:
		quota.MaxApps = 100
		quota.MaxUsers = 10000
		quota.MaxTokensPerHour = 100000
	}

	if err := tx.Create(quota).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 添加创建者为租户所有者
	tenantAdmin := &model.TenantAdmin{
		UserID:   ownerUserID,
		TenantID: tenant.ID,
		Role:     model.TenantRoleOwner,
	}

	if err := tx.Create(tenantAdmin).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 创建默认角色
	if err := s.createDefaultRoles(tx, tenant.ID); err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()

	// 审计日志
	aduit.LogAudit(ownerUserID, "创建租户", "tenant", string(rune(tenant.ID)), "", "")

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
		ID:          tenant.ID,
		Name:        tenant.Name,
		Code:        tenant.Code,
		Description: tenant.Description,
		Status:      tenant.Status,
		Plan:        tenant.Plan,
		CreatedAt:   tenant.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   tenant.UpdatedAt.Format("2006-01-02 15:04:05"),
		Stats:       *stats,
		Quota:       quota,
	}

	return info, nil
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
	var tenantAdmins []model.TenantAdmin
	if err := s.db.Preload("Tenant").Where("user_id = ?", userID).Find(&tenantAdmins).Error; err != nil {
		return nil, err
	}

	responses := make([]*TenantResponse, len(tenantAdmins))
	for i, ta := range tenantAdmins {
		resp := s.tenantToResponse(&ta.Tenant, nil)
		// 添加用户在租户中的角色信息
		resp.Metadata = make(map[string]interface{})
		resp.Metadata["user_role"] = ta.Role
		responses[i] = resp
	}

	return responses, nil
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
	if req.Plan != nil {
		updates["plan"] = *req.Plan
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
	aduit.LogAudit(0, "删除租户", "tenant", string(rune(tenantID)), "", "")

	return nil
}

// GetMemberRole 获取租户成员角色
func (s *TenantService) GetMemberRole(tenantID, userID uint) (model.TenantRole, error) {
	var tenantAdmin model.TenantAdmin
	if err := s.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&tenantAdmin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", errors.New("用户不在该租户中")
		}
		return "", err
	}

	return tenantAdmin.Role, nil
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
	var existingTA model.TenantAdmin
	if err := s.db.Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&existingTA).Error; err == nil {
		return errors.New("用户已在租户中")
	}

	// 创建租户管理员关联
	tenantAdmin := &model.TenantAdmin{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
	}

	if err := s.db.Create(tenantAdmin).Error; err != nil {
		return err
	}

	// 审计日志
	aduit.LogAudit(userID, "加入租户", "tenant", string(rune(tenantID)), "", "")

	return nil
}

// 辅助方法

func (s *TenantService) tenantToResponse(tenant *model.Tenant, stats *TenantStats) *TenantResponse {
	resp := &TenantResponse{
		ID:        tenant.ID,
		Name:      tenant.Name,
		Plan:      tenant.Plan,
		Metadata:  map[string]interface{}(tenant.Metadata),
		CreatedAt: tenant.CreatedAt.Format("2006-07-05 15:04:05"),
		UpdatedAt: tenant.UpdatedAt.Format("2006-07-05 15:04:05"),
		Stats:     stats,
	}

	return resp
}

func (s *TenantService) getTenantStats(tenantID uint) *TenantStats {
	stats := &TenantStats{}

	// 用户统计
	s.db.Model(&model.TenantAdmin{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalUsers)

	// 应用统计
	s.db.Model(&model.App{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalApps)
	s.db.Model(&model.App{}).Where("tenant_id = ? AND status = ?", tenantID, model.AppStatusActive).Count(&stats.ActiveApps)

	return stats
}

// getTenantDetailStats 获取租户详细统计信息
func (s *TenantService) getTenantDetailStats(tenantID uint) *TenantDetailStats {
	stats := &TenantDetailStats{}

	// 用户统计
	s.db.Model(&model.TenantAdmin{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalUsers)

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

func (s *TenantService) createDefaultRoles(tx *gorm.DB, tenantID uint) error {
	defaultRoles := []model.Role{
		{
			TenantID:    tenantID,
			Code:        "tenant_admin",
			Name:        "租户管理员",
			Description: "租户管理员角色",
			IsSystem:    true,
		},
		{
			TenantID:    tenantID,
			Code:        "app_developer",
			Name:        "应用开发者",
			Description: "应用开发者角色",
			IsSystem:    true,
		},
		{
			TenantID:    tenantID,
			Code:        "viewer",
			Name:        "查看者",
			Description: "只读访问角色",
			IsSystem:    true,
		},
	}

	for _, role := range defaultRoles {
		if err := tx.Create(&role).Error; err != nil {
			return err
		}
	}

	return nil
}
