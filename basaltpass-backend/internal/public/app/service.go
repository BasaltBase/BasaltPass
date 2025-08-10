package app

import (
	"basaltpass-backend/internal/public/aduit"
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// DetailedAppStats 详细应用统计信息
type DetailedAppStats struct {
	Period             string                 `json:"period"`
	TotalUsers         int                    `json:"total_users"`
	ActiveUsers        int                    `json:"active_users"`
	NewUsers           int                    `json:"new_users"`
	ReturningUsers     int                    `json:"returning_users"`
	RequestsToday      int                    `json:"requests_today"`
	RequestsThisWeek   int                    `json:"requests_this_week"`
	RequestsThisMonth  int                    `json:"requests_this_month"`
	ConversionRate     float64                `json:"conversion_rate"`
	AvgSessionDuration int                    `json:"avg_session_duration"`
	TopPages           []PageStats            `json:"top_pages"`
	UserGrowth         []UserGrowthStats      `json:"user_growth"`
	RequestTimeline    []RequestTimelineStats `json:"request_timeline"`
}

// PageStats 页面统计
type PageStats struct {
	Path           string `json:"path"`
	Views          int    `json:"views"`
	UniqueVisitors int    `json:"unique_visitors"`
}

// UserGrowthStats 用户增长统计
type UserGrowthStats struct {
	Date       string `json:"date"`
	NewUsers   int    `json:"new_users"`
	TotalUsers int    `json:"total_users"`
}

// RequestTimelineStats 请求时间线统计
type RequestTimelineStats struct {
	Date     string `json:"date"`
	Requests int    `json:"requests"`
}

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

	// 应用统计信息
	Stats *AppStats `json:"stats,omitempty"`
}

// AppStats 应用统计信息
type AppStats struct {
	TotalUsers    int64 `json:"total_users"`
	ActiveUsers   int64 `json:"active_users"`
	RequestsToday int64 `json:"requests_today"`
}

// AppWithOAuthClients 包含OAuth客户端信息的应用响应
type AppWithOAuthClients struct {
	ID           uint              `json:"id"`
	TenantID     uint              `json:"tenant_id"`
	Name         string            `json:"name"`
	Description  string            `json:"description"`
	IconURL      string            `json:"icon_url"`
	Status       model.AppStatus   `json:"status"`
	CreatedAt    string            `json:"created_at"`
	UpdatedAt    string            `json:"updated_at"`
	OAuthClients []OAuthClientInfo `json:"oauth_clients"`
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
	aduit.LogAudit(tenantID, "创建应用", "app", string(rune(app.ID)), "", "")

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

// GetTenantAppsWithOAuthClients 获取租户的应用和OAuth客户端信息
func (s *AppService) GetTenantAppsWithOAuthClients(tenantID uint, page, pageSize int, search string) ([]*AppWithOAuthClients, int64, error) {
	query := s.db.Where("tenant_id = ? AND status != ?", tenantID, model.AppStatusDeleted)

	if search != "" {
		query = query.Where("name ILIKE ?", "%"+search+"%")
	}

	var total int64
	query.Model(&model.App{}).Count(&total)

	var apps []model.App
	offset := (page - 1) * pageSize
	if err := query.Preload("OAuthClients").Offset(offset).Limit(pageSize).Find(&apps).Error; err != nil {
		return nil, 0, err
	}

	// 转换为响应格式
	var result []*AppWithOAuthClients
	for _, app := range apps {
		appWithClients := &AppWithOAuthClients{
			ID:           app.ID,
			TenantID:     app.TenantID,
			Name:         app.Name,
			Description:  app.Description,
			IconURL:      app.IconURL,
			Status:       app.Status,
			CreatedAt:    app.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    app.UpdatedAt.Format(time.RFC3339),
			OAuthClients: []OAuthClientInfo{},
		}

		for _, client := range app.OAuthClients {
			if client.IsActive {
				appWithClients.OAuthClients = append(appWithClients.OAuthClients, OAuthClientInfo{
					ID:           client.ID,
					ClientID:     client.ClientID,
					RedirectURIs: client.GetRedirectURIList(),
					Scopes:       client.GetScopeList(),
					IsActive:     client.IsActive,
					CreatedAt:    client.CreatedAt.Format(time.RFC3339),
				})
			}
		}

		result = append(result, appWithClients)
	}

	return result, total, nil
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
	aduit.LogAudit(tenantID, "更新应用", "app", string(rune(appID)), "", "")

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
	aduit.LogAudit(tenantID, "删除应用", "app", string(rune(appID)), "", "")

	return nil
}

// ToggleAppStatus 切换应用状态
func (s *AppService) ToggleAppStatus(tenantID, appID uint, status string) (*AppResponse, error) {
	// 验证状态值
	var appStatus model.AppStatus
	switch status {
	case "active":
		appStatus = model.AppStatusActive
	case "inactive":
		appStatus = model.AppStatusSuspended
	default:
		return nil, errors.New("无效的状态值")
	}

	// 查找应用
	var app model.App
	if err := s.db.Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("应用不存在")
		}
		return nil, err
	}

	// 更新状态
	if err := s.db.Model(&app).Update("status", appStatus).Error; err != nil {
		return nil, err
	}

	// 更新应用对象状态
	app.Status = appStatus

	// 获取OAuth客户端信息
	var oauthClients []model.OAuthClient
	s.db.Where("app_id = ?", appID).Find(&oauthClients)

	// 审计日志
	aduit.LogAudit(tenantID, "切换应用状态", "app", string(rune(appID)), "", status)

	return s.appToResponse(&app, oauthClients), nil
}

// GetAppStats 获取详细应用统计数据
func (s *AppService) GetAppStats(tenantID, appID uint, period string) (*DetailedAppStats, error) {
	// 验证应用是否存在且属于该租户
	var app model.App
	if err := s.db.Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("应用不存在")
		}
		return nil, err
	}

	stats := &DetailedAppStats{
		Period: period,
	}

	// 模拟统计数据（实际项目中应该从真实数据计算）
	switch period {
	case "7d":
		stats.TotalUsers = 1250
		stats.ActiveUsers = 890
		stats.NewUsers = 75
		stats.ReturningUsers = 815
		stats.RequestsToday = 2340
		stats.RequestsThisWeek = 15680
		stats.RequestsThisMonth = 15680
	case "30d":
		stats.TotalUsers = 3420
		stats.ActiveUsers = 2180
		stats.NewUsers = 320
		stats.ReturningUsers = 1860
		stats.RequestsToday = 2340
		stats.RequestsThisWeek = 15680
		stats.RequestsThisMonth = 67890
	case "90d":
		stats.TotalUsers = 8750
		stats.ActiveUsers = 4230
		stats.NewUsers = 890
		stats.ReturningUsers = 3340
		stats.RequestsToday = 2340
		stats.RequestsThisWeek = 15680
		stats.RequestsThisMonth = 67890
	default:
		stats.TotalUsers = 3420
		stats.ActiveUsers = 2180
		stats.NewUsers = 320
		stats.ReturningUsers = 1860
		stats.RequestsToday = 2340
		stats.RequestsThisWeek = 15680
		stats.RequestsThisMonth = 67890
	}

	stats.ConversionRate = 0.125
	stats.AvgSessionDuration = 420 // 7分钟

	// 模拟热门页面数据
	stats.TopPages = []PageStats{
		{Path: "/", Views: 12450, UniqueVisitors: 8920},
		{Path: "/dashboard", Views: 8760, UniqueVisitors: 6540},
		{Path: "/profile", Views: 5430, UniqueVisitors: 4230},
		{Path: "/settings", Views: 3210, UniqueVisitors: 2890},
		{Path: "/help", Views: 1890, UniqueVisitors: 1650},
	}

	// 模拟用户增长数据
	stats.UserGrowth = []UserGrowthStats{
		{Date: "2025-07-24", NewUsers: 45, TotalUsers: 3220},
		{Date: "2025-07-25", NewUsers: 52, TotalUsers: 3272},
		{Date: "2025-07-26", NewUsers: 38, TotalUsers: 3310},
		{Date: "2025-07-27", NewUsers: 61, TotalUsers: 3371},
		{Date: "2025-07-28", NewUsers: 33, TotalUsers: 3404},
		{Date: "2025-07-29", NewUsers: 42, TotalUsers: 3446},
		{Date: "2025-07-30", NewUsers: 28, TotalUsers: 3474},
	}

	// 模拟请求时间线数据
	stats.RequestTimeline = []RequestTimelineStats{
		{Date: "2025-07-24", Requests: 9840},
		{Date: "2025-07-25", Requests: 10230},
		{Date: "2025-07-26", Requests: 8750},
		{Date: "2025-07-27", Requests: 11450},
		{Date: "2025-07-28", Requests: 9200},
		{Date: "2025-07-29", Requests: 10780},
		{Date: "2025-07-30", Requests: 8920},
	}

	return stats, nil
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
		CreatedAt:   app.CreatedAt.Format("2006-01-02 15:04:05"),
		UpdatedAt:   app.UpdatedAt.Format("2006-01-02 15:04:05"),
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
				CreatedAt:    client.CreatedAt.Format("2006-01-02 15:04:05"),
			}
		}
	}

	// 添加应用统计信息
	resp.Stats = s.getAppStats(app.ID)

	return resp
}

// getAppStats 获取应用统计信息
func (s *AppService) getAppStats(appID uint) *AppStats {
	stats := &AppStats{}

	// 获取总用户数（这里需要与app_user模块配合）
	// 暂时返回模拟数据
	stats.TotalUsers = 0
	stats.ActiveUsers = 0
	stats.RequestsToday = 0

	return stats
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
