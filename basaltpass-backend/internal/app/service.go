package app

import (
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// AppService 应用管理服务
type AppService struct {
	db *gorm.DB
}

// NewAppService 创建应用服务实例
func NewAppService() *AppService {
	return &AppService{
		db: common.DB(),
	}
}

// CreateAppRequest 创建应用请求
type CreateAppRequest struct {
	Name           string   `json:"name" validate:"required,min=1,max=128"`
	Description    string   `json:"description" validate:"max=500"`
	IconURL        string   `json:"icon_url" validate:"omitempty,url"`
	RedirectURIs   []string `json:"redirect_uris" validate:"required,min=1"`
	Scopes         []string `json:"scopes"`
	AllowedOrigins []string `json:"allowed_origins"`
}

// UpdateAppRequest 更新应用请求
type UpdateAppRequest struct {
	Name        string           `json:"name" validate:"omitempty,min=1,max=128"`
	Description string           `json:"description" validate:"max=500"`
	IconURL     string           `json:"icon_url" validate:"omitempty,url"`
	Status      *model.AppStatus `json:"status" validate:"omitempty,oneof=active suspended deleted"`
}

// AppResponse 应用响应
type AppResponse struct {
	ID          uint            `json:"id"`
	TenantID    uint            `json:"tenant_id"`
	Name        string          `json:"name"`
	Description string          `json:"description"`
	IconURL     string          `json:"icon_url"`
	Status      model.AppStatus `json:"status"`
	CreatedAt   string          `json:"created_at"`
	UpdatedAt   string          `json:"updated_at"`

	// OAuth客户端信息
	OAuthClients []OAuthClientInfo `json:"oauth_clients,omitempty"`
}

// OAuthClientInfo OAuth客户端信息
type OAuthClientInfo struct {
	ID           uint     `json:"id"`
	ClientID     string   `json:"client_id"`
	RedirectURIs []string `json:"redirect_uris"`
	Scopes       []string `json:"scopes"`
	IsActive     bool     `json:"is_active"`
	CreatedAt    string   `json:"created_at"`
}

// CreateApp 创建应用
func (s *AppService) CreateApp(tenantID uint, req *CreateAppRequest) (*AppResponse, error) {
	// 验证租户权限（TODO: 添加更详细的权限检查）
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		return nil, errors.New("租户不存在")
	}

	// 创建应用
	app := &model.App{
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		IconURL:     req.IconURL,
		Status:      model.AppStatusActive,
	}

	// 开始事务
	tx := s.db.Begin()
	if err := tx.Create(app).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 创建默认OAuth客户端
	oauthClient := &model.OAuthClient{
		AppID:     app.ID,
		IsActive:  true,
		CreatedBy: tenantID, // TODO: 使用实际的创建者用户ID
	}

	// 生成客户端凭证
	if err := oauthClient.GenerateClientCredentials(); err != nil {
		tx.Rollback()
		return nil, err
	}

	// 设置重定向URI和权限范围
	oauthClient.SetRedirectURIList(req.RedirectURIs)
	if len(req.Scopes) > 0 {
		oauthClient.SetScopeList(req.Scopes)
	} else {
		oauthClient.SetScopeList([]string{"openid", "profile", "email"})
	}

	if len(req.AllowedOrigins) > 0 {
		oauthClient.SetAllowedOriginList(req.AllowedOrigins)
	}

	if err := tx.Create(oauthClient).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()

	// 审计日志
	common.LogAudit(tenantID, "创建应用", "app", string(rune(app.ID)), "", "")

	clients := []model.OAuthClient{*oauthClient}

	return s.appToResponse(app, clients), nil
}

// GetApp 获取应用详情
func (s *AppService) GetApp(tenantID, appID uint) (*AppResponse, error) {
	var app model.App
	if err := s.db.Where("id = ? AND tenant_id = ?", appID, tenantID).
		Preload("OAuthClients").
		First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("应用不存在")
		}
		return nil, err
	}

	return s.appToResponse(&app, app.OAuthClients), nil
}

// ListApps 获取应用列表
func (s *AppService) ListApps(tenantID uint, page, pageSize int, search string) ([]*AppResponse, int64, error) {
	var apps []model.App
	var total int64

	query := s.db.Where("tenant_id = ?", tenantID)
	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	// 计算总数
	if err := query.Model(&model.App{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 查询数据
	offset := (page - 1) * pageSize
	if err := query.Preload("OAuthClients").
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&apps).Error; err != nil {
		return nil, 0, err
	}

	// 转换响应
	responses := make([]*AppResponse, len(apps))
	for i, app := range apps {
		responses[i] = s.appToResponse(&app, app.OAuthClients)
	}

	return responses, total, nil
}

// UpdateApp 更新应用
func (s *AppService) UpdateApp(tenantID, appID uint, req *UpdateAppRequest) (*AppResponse, error) {
	var app model.App
	if err := s.db.Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("应用不存在")
		}
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
	if req.IconURL != "" {
		updates["icon_url"] = req.IconURL
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}

	if len(updates) > 0 {
		updates["updated_at"] = time.Now()
		if err := s.db.Model(&app).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	// 审计日志
	common.LogAudit(tenantID, "更新应用", "app", string(rune(appID)), "", "")

	// 重新查询返回
	return s.GetApp(tenantID, appID)
}

// DeleteApp 删除应用
func (s *AppService) DeleteApp(tenantID, appID uint) error {
	// 软删除应用
	result := s.db.Where("id = ? AND tenant_id = ?", appID, tenantID).
		Model(&model.App{}).
		Update("status", model.AppStatusDeleted)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return errors.New("应用不存在")
	}

	// 停用相关的OAuth客户端
	s.db.Where("app_id = ?", appID).
		Model(&model.OAuthClient{}).
		Update("is_active", false)

	// 审计日志
	common.LogAudit(tenantID, "删除应用", "app", string(rune(appID)), "", "")

	return nil
}

// 辅助方法

func (s *AppService) appToResponse(app *model.App, oauthClients []model.OAuthClient) *AppResponse {
	resp := &AppResponse{
		ID:          app.ID,
		TenantID:    app.TenantID,
		Name:        app.Name,
		Description: app.Description,
		IconURL:     app.IconURL,
		Status:      app.Status,
		CreatedAt:   app.CreatedAt.Format("2006-07-05 15:04:05"),
		UpdatedAt:   app.UpdatedAt.Format("2006-07-05 15:04:05"),
	}

	// 处理OAuth客户端信息
	if len(oauthClients) > 0 {
		resp.OAuthClients = make([]OAuthClientInfo, len(oauthClients))
		for i, client := range oauthClients {
			resp.OAuthClients[i] = OAuthClientInfo{
				ID:           client.ID,
				ClientID:     client.ClientID,
				RedirectURIs: client.GetRedirectURIList(),
				Scopes:       client.GetScopeList(),
				IsActive:     client.IsActive,
				CreatedAt:    client.CreatedAt.Format("2006-07-05 15:04:05"),
			}
		}
	}

	return resp
}

// 系统级管理员方法

// AdminListAllApps 系统管理员获取所有应用列表
func (s *AppService) AdminListAllApps(page, pageSize int, search string) ([]*AppResponse, int64, error) {
	var apps []model.App
	var total int64

	query := s.db.Model(&model.App{}).Preload("OAuthClients")

	// 搜索功能
	if search != "" {
		query = query.Where("name LIKE ? OR description LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Find(&apps).Error; err != nil {
		return nil, 0, err
	}

	responses := make([]*AppResponse, len(apps))
	for i, app := range apps {
		responses[i] = s.appToResponse(&app, app.OAuthClients)
	}

	return responses, total, nil
}

// AdminGetApp 系统管理员获取应用详情
func (s *AppService) AdminGetApp(appID string) (*AppResponse, error) {
	var app model.App
	if err := s.db.Preload("OAuthClients").Where("id = ?", appID).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("应用不存在")
		}
		return nil, err
	}

	return s.appToResponse(&app, app.OAuthClients), nil
}

// AdminCreateAppRequest 系统管理员创建应用请求（包含租户ID）
type AdminCreateAppRequest struct {
	TenantID       uint     `json:"tenant_id" validate:"required"`
	Name           string   `json:"name" validate:"required,min=1,max=128"`
	Description    string   `json:"description" validate:"max=500"`
	IconURL        string   `json:"icon_url" validate:"omitempty,url"`
	RedirectURIs   []string `json:"redirect_uris" validate:"required,min=1"`
	Scopes         []string `json:"scopes"`
	AllowedOrigins []string `json:"allowed_origins"`
}

// AdminCreateApp 系统管理员创建应用
func (s *AppService) AdminCreateApp(req *AdminCreateAppRequest) (*AppResponse, error) {
	// 验证租户存在
	var tenant model.Tenant
	if err := s.db.First(&tenant, req.TenantID).Error; err != nil {
		return nil, errors.New("租户不存在")
	}

	// 创建应用
	app := &model.App{
		TenantID:    req.TenantID,
		Name:        req.Name,
		Description: req.Description,
		IconURL:     req.IconURL,
		Status:      model.AppStatusActive,
	}

	// 开始事务
	tx := s.db.Begin()
	if err := tx.Create(app).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 创建默认OAuth客户端
	oauthClient := &model.OAuthClient{
		AppID:     app.ID,
		IsActive:  true,
		CreatedBy: 1, // 系统创建
	}

	// 生成客户端凭证
	if err := oauthClient.GenerateClientCredentials(); err != nil {
		tx.Rollback()
		return nil, err
	}

	// 设置重定向URI和作用域
	oauthClient.SetRedirectURIList(req.RedirectURIs)
	oauthClient.SetScopeList(req.Scopes)
	if len(req.AllowedOrigins) > 0 {
		oauthClient.SetAllowedOriginList(req.AllowedOrigins)
	}

	if err := tx.Create(oauthClient).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 返回创建的应用信息
	var createdApp model.App
	if err := s.db.Preload("OAuthClients").First(&createdApp, app.ID).Error; err != nil {
		return nil, err
	}

	return s.appToResponse(&createdApp, createdApp.OAuthClients), nil
}

// AdminUpdateApp 系统管理员更新应用
func (s *AppService) AdminUpdateApp(appID string, req *UpdateAppRequest) (*AppResponse, error) {
	var app model.App
	if err := s.db.Where("id = ?", appID).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("应用不存在")
		}
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
	if req.IconURL != "" {
		updates["icon_url"] = req.IconURL
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	updates["updated_at"] = time.Now()

	if err := s.db.Model(&app).Updates(updates).Error; err != nil {
		return nil, err
	}

	// 获取更新后的应用
	if err := s.db.Preload("OAuthClients").First(&app, appID).Error; err != nil {
		return nil, err
	}

	return s.appToResponse(&app, app.OAuthClients), nil
}

// AdminDeleteApp 系统管理员删除应用
func (s *AppService) AdminDeleteApp(appID string) error {
	var app model.App
	if err := s.db.Where("id = ?", appID).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("应用不存在")
		}
		return err
	}

	// 开始事务
	tx := s.db.Begin()

	// 删除相关的OAuth客户端
	if err := tx.Where("app_id = ?", app.ID).Delete(&model.OAuthClient{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 删除应用
	if err := tx.Delete(&app).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}
