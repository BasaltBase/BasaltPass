package tenant

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

type AdminTenantService struct {
	db *gorm.DB
}

func NewAdminTenantService(db *gorm.DB) *AdminTenantService {
	return &AdminTenantService{db: db}
}

// GetTenantList 获取租户列表
func (s *AdminTenantService) GetTenantList(req AdminTenantListRequest) (*TenantListResponse, error) {
	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}
	if req.SortBy == "" {
		req.SortBy = "created_at"
	}
	if req.SortOrder == "" {
		req.SortOrder = "desc"
	}

	var tenants []model.Tenant
	var total int64

	query := s.db.Model(&model.Tenant{})

	// 搜索条件
	if req.Search != "" {
		searchPattern := "%" + req.Search + "%"
		query = query.Where("name LIKE ? OR code LIKE ? OR description LIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// 状态筛选
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}

	// 套餐筛选
	if req.Plan != "" {
		query = query.Where("plan = ?", req.Plan)
	}

	// 时间筛选
	if req.CreatedStart != nil {
		query = query.Where("created_at >= ?", *req.CreatedStart)
	}
	if req.CreatedEnd != nil {
		query = query.Where("created_at <= ?", *req.CreatedEnd)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 排序
	orderClause := fmt.Sprintf("%s %s", req.SortBy, strings.ToUpper(req.SortOrder))
	query = query.Order(orderClause)

	// 分页
	offset := (req.Page - 1) * req.Limit
	query = query.Offset(offset).Limit(req.Limit)

	// 预加载关联数据
	query = query.Preload("TenantAdmins.User")

	if err := query.Find(&tenants).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	tenantResponses := make([]AdminTenantListResponse, len(tenants))
	for i, tenant := range tenants {
		tenantResponses[i] = s.convertToAdminTenantListResponse(tenant)
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &TenantListResponse{
		Tenants: tenantResponses,
		Pagination: PaginationResponse{
			Page:       req.Page,
			Limit:      req.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// GetTenantDetail 获取租户详情
func (s *AdminTenantService) GetTenantDetail(tenantID uint) (*AdminTenantDetailResponse, error) {
	var tenant model.Tenant

	err := s.db.Preload("TenantAdmins.User").
		First(&tenant, tenantID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	response := &AdminTenantDetailResponse{
		AdminTenantListResponse: s.convertToAdminTenantListResponse(tenant),
	}

	// 解析设置
	response.Settings = s.parseTenantSettings(tenant.Metadata)

	// 获取统计数据
	stats, err := s.getTenantStats(tenantID)
	if err != nil {
		return nil, err
	}
	response.Stats = *stats

	// 获取最近用户
	recentUsers, err := s.getRecentUsers(tenantID, 5)
	if err != nil {
		return nil, err
	}
	response.RecentUsers = recentUsers

	// 获取最近应用
	recentApps, err := s.getRecentApps(tenantID, 5)
	if err != nil {
		return nil, err
	}
	response.RecentApps = recentApps

	return response, nil
}

// CreateTenant 创建租户
func (s *AdminTenantService) CreateTenant(req AdminCreateTenantRequest) (*model.Tenant, error) {
	// 验证必填字段
	if req.Name == "" {
		return nil, errors.New("租户名称不能为空")
	}
	if req.Code == "" {
		return nil, errors.New("租户代码不能为空")
	}
	if req.OwnerEmail == "" {
		return nil, errors.New("所有者邮箱不能为空")
	}

	// 检查代码是否已存在
	var existingTenant model.Tenant
	if err := s.db.Where("code = ?", req.Code).First(&existingTenant).Error; err == nil {
		return nil, errors.New("租户代码已存在")
	}

	// 查找或创建所有者
	var owner model.User
	if err := s.db.Where("email = ?", req.OwnerEmail).First(&owner).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("指定的所有者邮箱不存在，请先创建用户")
		}
		return nil, err
	}

	// 序列化设置到metadata
	metadataMap := make(model.JSONMap)
	// 总是保存设置，即使是默认值
	metadataMap["settings"] = req.Settings

	// 创建租户
	tenant := model.Tenant{
		Name:        req.Name,
		Code:        req.Code,
		Description: req.Description,
		Plan:        model.TenantPlan(req.Plan),
		Status:      model.TenantStatusActive,
		Metadata:    metadataMap,
	}

	if err := s.db.Create(&tenant).Error; err != nil {
		return nil, fmt.Errorf("创建租户失败: %v", err)
	}

	// 创建租户成员关系
	membership := model.TenantAdmin{
		TenantID: tenant.ID,
		UserID:   owner.ID,
		Role:     model.TenantRoleOwner,
	}

	if err := s.db.Create(&membership).Error; err != nil {
		return nil, fmt.Errorf("创建租户成员关系失败: %v", err)
	}

	// 重新加载租户信息
	s.db.Preload("TenantAdmins.User").First(&tenant, tenant.ID)

	return &tenant, nil
}

// UpdateTenant 更新租户信息
func (s *AdminTenantService) UpdateTenant(tenantID uint, req AdminUpdateTenantRequest) error {
	updates := make(map[string]interface{})

	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Plan != nil {
		updates["plan"] = *req.Plan
	}
	if req.Status != nil {
		updates["status"] = *req.Status
	}
	if req.Settings != nil {
		if updates["metadata"] == nil {
			updates["metadata"] = make(model.JSONMap)
		}
		metadata := updates["metadata"].(model.JSONMap)
		metadata["settings"] = req.Settings
		updates["metadata"] = metadata
	}

	if len(updates) == 0 {
		return errors.New("没有可更新的字段")
	}

	return s.db.Model(&model.Tenant{}).Where("id = ?", tenantID).Updates(updates).Error
}

// DeleteTenant 删除租户（软删除）
func (s *AdminTenantService) DeleteTenant(tenantID uint) error {
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("租户不存在")
		}
		return err
	}

	// 执行软删除
	return s.db.Delete(&tenant).Error
}

// GetTenantStats 获取租户统计数据
func (s *AdminTenantService) GetTenantStats() (*TenantStatsResponse, error) {
	var stats TenantStatsResponse

	// 总租户数
	s.db.Model(&model.Tenant{}).Count(&stats.TotalTenants)

	// 按状态统计
	s.db.Model(&model.Tenant{}).Where("status = ?", "active").Count(&stats.ActiveTenants)
	s.db.Model(&model.Tenant{}).Where("status = ?", "suspended").Count(&stats.SuspendedTenants)
	s.db.Model(&model.Tenant{}).Where("status = ?", "deleted").Count(&stats.DeletedTenants)

	// 按套餐统计
	s.db.Model(&model.Tenant{}).Where("plan = ?", "free").Count(&stats.FreePlanTenants)
	s.db.Model(&model.Tenant{}).Where("plan = ?", "pro").Count(&stats.ProPlanTenants)
	s.db.Model(&model.Tenant{}).Where("plan = ?", "enterprise").Count(&stats.EnterprisePlanTenants)

	// 今天新租户
	today := time.Now().Truncate(24 * time.Hour)
	s.db.Model(&model.Tenant{}).Where("created_at >= ?", today).Count(&stats.NewTenantsToday)

	// 本周新租户
	weekStart := time.Now().AddDate(0, 0, -int(time.Now().Weekday())).Truncate(24 * time.Hour)
	s.db.Model(&model.Tenant{}).Where("created_at >= ?", weekStart).Count(&stats.NewTenantsThisWeek)

	// 本月新租户
	monthStart := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.Now().Location())
	s.db.Model(&model.Tenant{}).Where("created_at >= ?", monthStart).Count(&stats.NewTenantsThisMonth)

	return &stats, nil
}

// 私有方法

// convertToAdminTenantListResponse 转换为管理员租户列表响应
func (s *AdminTenantService) convertToAdminTenantListResponse(tenant model.Tenant) AdminTenantListResponse {
	response := AdminTenantListResponse{
		ID:          tenant.ID,
		Name:        tenant.Name,
		Code:        tenant.Code,
		Description: tenant.Description,
		Plan:        string(tenant.Plan),
		Status:      string(tenant.Status),
		CreatedAt:   tenant.CreatedAt,
		UpdatedAt:   tenant.UpdatedAt,
	}

	// 所有者信息 - 从TenantAdmins中找owner
	for _, admin := range tenant.TenantAdmins {
		if admin.Role == model.TenantRoleOwner && admin.User.ID > 0 {
			response.OwnerID = admin.UserID
			response.OwnerEmail = admin.User.Email
			response.OwnerName = admin.User.Nickname
			if response.OwnerName == "" {
				response.OwnerName = admin.User.Email
			}
			break
		}
	}

	// 获取用户和应用数量
	s.db.Model(&model.TenantAdmin{}).Where("tenant_id = ?", tenant.ID).Count(&response.UserCount)
	s.db.Model(&model.App{}).Where("tenant_id = ?", tenant.ID).Count(&response.AppCount)

	return response
}

// parseTenantSettings 解析租户设置
func (s *AdminTenantService) parseTenantSettings(metadata model.JSONMap) TenantSettings {
	// 默认设置
	settings := TenantSettings{
		MaxUsers:    100,
		MaxApps:     10,
		MaxStorage:  1024, // 1GB
		EnableAPI:   true,
		EnableSSO:   false,
		EnableAudit: false,
	}

	// 从metadata中解析设置
	if settingsData, exists := metadata["settings"]; exists {
		if settingsMap, ok := settingsData.(map[string]interface{}); ok {
			if maxUsers, ok := settingsMap["max_users"].(float64); ok {
				settings.MaxUsers = int(maxUsers)
			}
			if maxApps, ok := settingsMap["max_apps"].(float64); ok {
				settings.MaxApps = int(maxApps)
			}
			if maxStorage, ok := settingsMap["max_storage"].(float64); ok {
				settings.MaxStorage = int(maxStorage)
			}
			if enableAPI, ok := settingsMap["enable_api"].(bool); ok {
				settings.EnableAPI = enableAPI
			}
			if enableSSO, ok := settingsMap["enable_sso"].(bool); ok {
				settings.EnableSSO = enableSSO
			}
			if enableAudit, ok := settingsMap["enable_audit"].(bool); ok {
				settings.EnableAudit = enableAudit
			}
		}
	}

	return settings
}

// getTenantStats 获取租户统计
func (s *AdminTenantService) getTenantStats(tenantID uint) (*TenantStats, error) {
	var stats TenantStats

	// 获取用户统计
	s.db.Model(&model.TenantAdmin{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalUsers)
	s.db.Table("tenant_admins").
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ? AND users.banned = ?", tenantID, false).
		Count(&stats.ActiveUsers)

	// 获取应用统计
	s.db.Model(&model.App{}).Where("tenant_id = ?", tenantID).Count(&stats.TotalApps)
	s.db.Model(&model.App{}).Where("tenant_id = ? AND status = ?", tenantID, "active").Count(&stats.ActiveApps)

	stats.StorageUsed = 0
	stats.APICallsThisMonth = 0
	stats.LastActiveAt = nil

	now := time.Now().UTC()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	var usageMetric model.TenantUsageMetric
	err := s.db.Where("tenant_id = ? AND period_start = ?", tenantID, periodStart).First(&usageMetric).Error
	metricFound := err == nil
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if metricFound {
		stats.StorageUsed = usageMetric.StorageUsed
		stats.APICallsThisMonth = usageMetric.APICallCount
		if usageMetric.LastActiveAt != nil {
			stats.LastActiveAt = usageMetric.LastActiveAt
		}
	}

	shouldPersistMetric := !metricFound

	if stats.StorageUsed == 0 {
		storageUsed, err := s.estimateTenantStorageUsage(tenantID)
		if err != nil {
			return nil, err
		}
		stats.StorageUsed = storageUsed
		if usageMetric.StorageUsed != storageUsed {
			usageMetric.StorageUsed = storageUsed
			shouldPersistMetric = true
		}
	}

	apiCalls, lastAPICallAt, err := s.aggregateTenantAPICalls(tenantID, periodStart)
	if err != nil {
		return nil, err
	}
	if stats.APICallsThisMonth == 0 {
		stats.APICallsThisMonth = apiCalls
		if usageMetric.APICallCount != apiCalls {
			usageMetric.APICallCount = apiCalls
			shouldPersistMetric = true
		}
	}

	// 计算活跃时间（API日志、审计日志等来源取最大值）
	candidateTimes := make([]time.Time, 0, 3)
	if stats.LastActiveAt != nil {
		candidateTimes = append(candidateTimes, *stats.LastActiveAt)
	}
	if lastAPICallAt != nil {
		candidateTimes = append(candidateTimes, *lastAPICallAt)
	}
	auditLastActive, err := s.findTenantLastActiveFromAudit(tenantID)
	if err != nil {
		return nil, err
	}
	if auditLastActive != nil {
		candidateTimes = append(candidateTimes, *auditLastActive)
	}

	if len(candidateTimes) > 0 {
		latest := candidateTimes[0]
		for _, ts := range candidateTimes[1:] {
			if ts.After(latest) {
				latest = ts
			}
		}
		stats.LastActiveAt = &latest
		if usageMetric.LastActiveAt == nil || latest.After(*usageMetric.LastActiveAt) {
			usageMetric.LastActiveAt = &latest
			shouldPersistMetric = true
		}
	}

	if !metricFound {
		usageMetric.TenantID = tenantID
		usageMetric.PeriodStart = periodStart
	}

	if shouldPersistMetric {
		if metricFound {
			if err := s.db.Save(&usageMetric).Error; err != nil {
				return nil, err
			}
		} else {
			if err := s.db.Create(&usageMetric).Error; err != nil {
				return nil, err
			}
		}
	}

	return &stats, nil
}

func (s *AdminTenantService) aggregateTenantAPICalls(tenantID uint, periodStart time.Time) (int64, *time.Time, error) {
	periodEnd := periodStart.AddDate(0, 1, 0)

	var apiSum sql.NullFloat64
	row := s.db.Table("usage_records AS ur").
		Joins("JOIN subscription_items AS si ON si.id = ur.subscription_item_id").
		Joins("JOIN subscriptions AS sub ON sub.id = si.subscription_id").
		Where("sub.tenant_id = ?", tenantID).
		Where("ur.ts >= ? AND ur.ts < ?", periodStart, periodEnd).
		Select("COALESCE(SUM(ur.quantity), 0)").
		Row()
	if err := row.Scan(&apiSum); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, nil, err
	}

	var lastAPICall sql.NullString
	lastRow := s.db.Table("usage_records AS ur").
		Joins("JOIN subscription_items AS si ON si.id = ur.subscription_item_id").
		Joins("JOIN subscriptions AS sub ON sub.id = si.subscription_id").
		Where("sub.tenant_id = ?", tenantID).
		Select("MAX(ur.ts)").
		Row()
	if err := lastRow.Scan(&lastAPICall); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, nil, err
	}

	var apiCalls int64
	if apiSum.Valid {
		apiCalls = int64(math.Round(apiSum.Float64))
	}

	if lastAPICall.Valid {
		if ts, err := parseTimestamp(lastAPICall.String); err == nil {
			return apiCalls, ts, nil
		}
	}

	return apiCalls, nil, nil
}

func (s *AdminTenantService) estimateTenantStorageUsage(tenantID uint) (int64, error) {
	var tenant model.Tenant
	if err := s.db.Select("metadata").First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, nil
		}
		return 0, err
	}

	if tenant.Metadata == nil {
		return 0, nil
	}

	var total int64

	if v, ok := tenant.Metadata["storage_used_mb"]; ok {
		total += parseNumericToInt64(v)
	}

	if usageData, ok := tenant.Metadata["usage"].(map[string]interface{}); ok {
		if storage, ok := usageData["storage_mb"]; ok {
			total += parseNumericToInt64(storage)
		}
	}

	return total, nil
}

func (s *AdminTenantService) findTenantLastActiveFromAudit(tenantID uint) (*time.Time, error) {
	var auditLast sql.NullString
	row := s.db.Table("audit_logs AS al").
		Joins("JOIN tenant_admins AS ta ON ta.user_id = al.user_id").
		Where("ta.tenant_id = ?", tenantID).
		Select("MAX(al.created_at)").
		Row()
	if err := row.Scan(&auditLast); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	if auditLast.Valid {
		if ts, err := parseTimestamp(auditLast.String); err == nil {
			return ts, nil
		}
	}

	return nil, nil
}

func parseNumericToInt64(value interface{}) int64 {
	switch v := value.(type) {
	case int:
		return int64(v)
	case int32:
		return int64(v)
	case int64:
		return v
	case float32:
		return int64(math.Round(float64(v)))
	case float64:
		return int64(math.Round(v))
	case json.Number:
		if i, err := v.Int64(); err == nil {
			return i
		}
		if f, err := v.Float64(); err == nil {
			return int64(math.Round(f))
		}
	}
	return 0
}

func parseTimestamp(value string) (*time.Time, error) {
	if value == "" {
		return nil, fmt.Errorf("empty time string")
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
	}

	for _, layout := range layouts {
		if ts, err := time.Parse(layout, value); err == nil {
			return &ts, nil
		}
	}

	return nil, fmt.Errorf("unsupported time format: %s", value)
}

// getRecentUsers 获取最近用户
func (s *AdminTenantService) getRecentUsers(tenantID uint, limit int) ([]RecentUser, error) {
	var users []RecentUser

	err := s.db.Table("users").
		Select("users.id, users.email, users.nickname, tenant_admins.created_at").
		Joins("JOIN tenant_admins ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ?", tenantID).
		Order("tenant_admins.created_at DESC").
		Limit(limit).
		Scan(&users).Error

	return users, err
}

// getRecentApps 获取最近应用
func (s *AdminTenantService) getRecentApps(tenantID uint, limit int) ([]RecentApp, error) {
	var apps []RecentApp

	err := s.db.Model(&model.App{}).
		Select("id, name, description, created_at").
		Where("tenant_id = ?", tenantID).
		Order("created_at DESC").
		Limit(limit).
		Scan(&apps).Error

	return apps, err
}

// GetTenantUsers 获取租户用户列表
func (s *AdminTenantService) GetTenantUsers(tenantID uint, req AdminTenantUserListRequest) (*AdminTenantUserListResponse, error) {
	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Limit < 1 || req.Limit > 100 {
		req.Limit = 20
	}

	// 检查租户是否存在
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("租户不存在")
		}
		return nil, err
	}

	var allUsers []AdminTenantUser

	// 根据用户类型分别查询
	if req.UserType == "" || req.UserType == "all" || req.UserType == "tenant_admin" {
		tenantUsers, err := s.getTenantAdmins(tenantID, req)
		if err != nil {
			return nil, err
		}
		allUsers = append(allUsers, tenantUsers...)
	}

	if req.UserType == "" || req.UserType == "all" || req.UserType == "app_user" {
		appUsers, err := s.getAppUsers(tenantID, req)
		if err != nil {
			return nil, err
		}
		allUsers = append(allUsers, appUsers...)
	}

	// 应用搜索过滤
	if req.Search != "" {
		var filteredUsers []AdminTenantUser
		searchPattern := strings.ToLower(req.Search)
		for _, user := range allUsers {
			if strings.Contains(strings.ToLower(user.Email), searchPattern) ||
				strings.Contains(strings.ToLower(user.Nickname), searchPattern) {
				filteredUsers = append(filteredUsers, user)
			}
		}
		allUsers = filteredUsers
	}

	// 应用角色过滤
	if req.Role != "" {
		var filteredUsers []AdminTenantUser
		for _, user := range allUsers {
			if user.Role == req.Role {
				filteredUsers = append(filteredUsers, user)
			}
		}
		allUsers = filteredUsers
	}

	// 应用状态过滤
	if req.Status != "" {
		var filteredUsers []AdminTenantUser
		for _, user := range allUsers {
			if user.Status == req.Status {
				filteredUsers = append(filteredUsers, user)
			}
		}
		allUsers = filteredUsers
	}

	// 计算总数
	total := int64(len(allUsers))

	// 应用分页
	offset := (req.Page - 1) * req.Limit
	end := offset + req.Limit
	if offset >= len(allUsers) {
		allUsers = []AdminTenantUser{}
	} else {
		if end > len(allUsers) {
			end = len(allUsers)
		}
		allUsers = allUsers[offset:end]
	}

	// 计算总页数
	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &AdminTenantUserListResponse{
		Users: allUsers,
		Pagination: PaginationResponse{
			Page:       req.Page,
			Limit:      req.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// getTenantAdmins 获取租户管理员
func (s *AdminTenantService) getTenantAdmins(tenantID uint, req AdminTenantUserListRequest) ([]AdminTenantUser, error) {
	var users []AdminTenantUser

	query := s.db.Table("users").
		Select(`
			users.id, 
			users.email, 
			users.nickname, 
			tenant_admins.role, 
			'tenant_admin' as user_type, 
			CASE WHEN users.banned = true THEN 'banned' ELSE 'active' END as status,
			NULL as app_name,
			NULL as last_active_at,
			tenant_admins.created_at
		`).
		Joins("JOIN tenant_admins ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ?", tenantID).
		Order("tenant_admins.created_at DESC")

	if err := query.Scan(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}

// getAppUsers 获取应用用户
func (s *AdminTenantService) getAppUsers(tenantID uint, req AdminTenantUserListRequest) ([]AdminTenantUser, error) {
	var users []AdminTenantUser

	query := s.db.Table("users").
		Select(`
			users.id, 
			users.email, 
			users.nickname, 
			'member' as role, 
			'app_user' as user_type, 
			CASE WHEN users.banned = true THEN 'banned' ELSE 'active' END as status,
			apps.name as app_name,
			NULL as last_active_at,
			app_users.created_at
		`).
		Joins("JOIN app_users ON users.id = app_users.user_id").
		Joins("JOIN apps ON app_users.app_id = apps.id").
		Where("apps.tenant_id = ?", tenantID).
		Order("app_users.created_at DESC")

	if err := query.Scan(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}

// RemoveTenantUser 移除租户用户
func (s *AdminTenantService) RemoveTenantUser(tenantID, userID uint) error {
	// 检查租户是否存在
	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("租户不存在")
		}
		return err
	}

	// 检查用户是否存在
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return err
	}

	// 开始事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 检查是否是租户管理员
	var tenantAdmin model.TenantAdmin
	if err := tx.Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&tenantAdmin).Error; err == nil {
		// 检查是否是所有者
		if tenantAdmin.Role == model.TenantRoleOwner {
			tx.Rollback()
			return errors.New("不能移除租户所有者")
		}

		// 删除租户管理员记录
		if err := tx.Delete(&tenantAdmin).Error; err != nil {
			tx.Rollback()
			return err
		}
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		tx.Rollback()
		return err
	}

	// 删除应用用户记录（如果有的话）
	if err := tx.Where("user_id = ? AND app_id IN (SELECT id FROM apps WHERE tenant_id = ?)", userID, tenantID).
		Delete(&model.AppUser{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// 提交事务
	return tx.Commit().Error
}
