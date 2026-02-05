package tenant

import (
	"errors"
	"fmt"
	"math"
	"time"

	admindto "basaltpass-backend/internal/dto/tenant"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// AdminTenantService 管理端租户服务
type AdminTenantService struct{ db *gorm.DB }

func NewAdminTenantService(db *gorm.DB) *AdminTenantService { return &AdminTenantService{db: db} }

// GetTenantList 获取租户列表（分页）
func (s *AdminTenantService) GetTenantList(req admindto.AdminTenantListRequest) (*admindto.TenantListResponse, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	offset := (req.Page - 1) * req.Limit

	query := s.db.Model(&model.Tenant{})
	if req.Search != "" {
		like := fmt.Sprintf("%%%s%%", req.Search)
		query = query.Where("name LIKE ? OR code LIKE ?", like, like)
	}
	if req.Status != "" {
		query = query.Where("status = ?", req.Status)
	}
	if req.Plan != "" {
		query = query.Where("plan = ?", req.Plan)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var tenants []model.Tenant
	if err := query.Offset(offset).Limit(req.Limit).Order("id DESC").Find(&tenants).Error; err != nil {
		return nil, err
	}

	if len(tenants) == 0 {
		return &admindto.TenantListResponse{Tenants: []admindto.AdminTenantListResponse{}, Pagination: admindto.PaginationResponse{Page: req.Page, Limit: req.Limit, Total: 0, TotalPages: 0}}, nil
	}

	ids := make([]uint, 0, len(tenants))
	for _, t := range tenants {
		ids = append(ids, t.ID)
	}

	// 统计用户数量（租户管理员数量）
	type pair struct {
		TenantID uint
		Cnt      int64
	}
	adminCounts := map[uint]int64{}
	var rows1 []pair
	s.db.Model(&model.TenantAdmin{}).Select("tenant_id, COUNT(*) as cnt").Where("tenant_id IN ?", ids).Group("tenant_id").Scan(&rows1)
	for _, r := range rows1 {
		adminCounts[r.TenantID] = r.Cnt
	}

	// 统计应用数量
	appCounts := map[uint]int64{}
	var rows2 []pair
	s.db.Model(&model.App{}).Select("tenant_id, COUNT(*) as cnt").Where("tenant_id IN ?", ids).Group("tenant_id").Scan(&rows2)
	for _, r := range rows2 {
		appCounts[r.TenantID] = r.Cnt
	}

	list := make([]admindto.AdminTenantListResponse, 0, len(tenants))
	for _, t := range tenants {
		list = append(list, admindto.AdminTenantListResponse{
			ID: t.ID, Name: t.Name, Code: t.Code, Description: t.Description, Plan: string(t.Plan), Status: string(t.Status),
			UserCount: adminCounts[t.ID], AppCount: appCounts[t.ID], CreatedAt: t.CreatedAt, UpdatedAt: t.UpdatedAt,
		})
	}

	totalPages := int(math.Ceil(float64(total) / float64(req.Limit)))
	return &admindto.TenantListResponse{Tenants: list, Pagination: admindto.PaginationResponse{Page: req.Page, Limit: req.Limit, Total: total, TotalPages: totalPages}}, nil
}

// GetTenantDetail 获取租户详情
func (s *AdminTenantService) GetTenantDetail(id uint) (*admindto.AdminTenantDetailResponse, error) {
	var tenant model.Tenant
	if err := s.db.First(&tenant, id).Error; err != nil {
		return nil, errors.New("租户不存在")
	}

	var adminCount int64
	s.db.Model(&model.TenantAdmin{}).Where("tenant_id = ?", id).Count(&adminCount)
	var appCount int64
	s.db.Model(&model.App{}).Where("tenant_id = ?", id).Count(&appCount)
	var activeAppCount int64
	s.db.Model(&model.App{}).Where("tenant_id = ? AND status = ?", id, model.AppStatusActive).Count(&activeAppCount)

	// Recent users
	var tas []model.TenantAdmin
	s.db.Preload("User").Where("tenant_id = ?", id).Order("created_at DESC").Limit(5).Find(&tas)
	recentUsers := make([]admindto.RecentUser, 0, len(tas))
	for _, ta := range tas {
		recentUsers = append(recentUsers, admindto.RecentUser{ID: ta.UserID, Email: ta.User.Email, Nickname: ta.User.Nickname, CreatedAt: ta.CreatedAt})
	}

	var apps []model.App
	s.db.Where("tenant_id = ?", id).Order("created_at DESC").Limit(5).Find(&apps)
	recentApps := make([]admindto.RecentApp, 0, len(apps))
	for _, a := range apps {
		recentApps = append(recentApps, admindto.RecentApp{ID: a.ID, Name: a.Name, Description: a.Description, CreatedAt: a.CreatedAt})
	}

	base := admindto.AdminTenantListResponse{ID: tenant.ID, Name: tenant.Name, Code: tenant.Code, Description: tenant.Description, Plan: string(tenant.Plan), Status: string(tenant.Status), UserCount: adminCount, AppCount: appCount, CreatedAt: tenant.CreatedAt, UpdatedAt: tenant.UpdatedAt}
	stats := admindto.TenantStats{TotalUsers: adminCount, ActiveUsers: adminCount, TotalApps: appCount, ActiveApps: activeAppCount}
	return &admindto.AdminTenantDetailResponse{AdminTenantListResponse: base, Settings: admindto.TenantSettings{}, Stats: stats, RecentUsers: recentUsers, RecentApps: recentApps}, nil
}

// CreateTenant 创建租户（仅最小实现）
func (s *AdminTenantService) CreateTenant(req admindto.AdminCreateTenantRequest) (*model.Tenant, error) {
	if req.Name == "" || req.Code == "" {
		return nil, errors.New("名称与代码必填")
	}
	if req.OwnerEmail == "" {
		return nil, errors.New("租户所有者邮箱必填")
	}

	// 唯一性检查
	var cnt int64
	s.db.Model(&model.Tenant{}).Where("code = ?", req.Code).Count(&cnt)
	if cnt > 0 {
		return nil, errors.New("租户代码已存在")
	}
	s.db.Model(&model.Tenant{}).Where("name = ?", req.Name).Count(&cnt)
	if cnt > 0 {
		return nil, errors.New("租户名称已存在")
	}

	// 查找所有者用户
	var owner model.User
	if err := s.db.Where("email = ?", req.OwnerEmail).First(&owner).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("所有者用户不存在: %s", req.OwnerEmail)
		}
		return nil, fmt.Errorf("查询用户失败: %w", err)
	}

	// 使用事务创建租户和绑定关系
	var tenant *model.Tenant
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 创建租户
		tenant = &model.Tenant{Name: req.Name, Code: req.Code, Description: req.Description, Plan: model.TenantPlan(req.Plan)}
		if err := tx.Create(tenant).Error; err != nil {
			return fmt.Errorf("创建租户失败: %w", err)
		}

		// 绑定所有者到tenant_admin表，角色为owner
		tenantAdmin := &model.TenantAdmin{
			UserID:   owner.ID,
			TenantID: tenant.ID,
			Role:     model.TenantRoleOwner,
		}
		if err := tx.Create(tenantAdmin).Error; err != nil {
			return fmt.Errorf("绑定租户所有者失败: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return tenant, nil
}

// UpdateTenant 更新租户
func (s *AdminTenantService) UpdateTenant(id uint, req admindto.AdminUpdateTenantRequest) error {
	var tenant model.Tenant
	if err := s.db.First(&tenant, id).Error; err != nil {
		return errors.New("租户不存在")
	}
	updates := map[string]interface{}{}
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
	if len(updates) == 0 {
		return errors.New("无可更新字段")
	}
	return s.db.Model(&tenant).Updates(updates).Error
}

// DeleteTenant 删除租户
func (s *AdminTenantService) DeleteTenant(id uint) error {
	return s.db.Delete(&model.Tenant{}, id).Error
}

// GetTenantStats 聚合统计
func (s *AdminTenantService) GetTenantStats() (*admindto.TenantStatsResponse, error) {
	var stats admindto.TenantStatsResponse
	s.db.Model(&model.Tenant{}).Count(&stats.TotalTenants)
	s.db.Model(&model.Tenant{}).Where("status = ?", model.TenantStatusActive).Count(&stats.ActiveTenants)
	s.db.Model(&model.Tenant{}).Where("status = ?", model.TenantStatusSuspended).Count(&stats.SuspendedTenants)
	s.db.Model(&model.Tenant{}).Where("status = ?", model.TenantStatusDeleted).Count(&stats.DeletedTenants)
	s.db.Model(&model.Tenant{}).Where("plan = ?", model.TenantPlanFree).Count(&stats.FreePlanTenants)
	s.db.Model(&model.Tenant{}).Where("plan = ?", model.TenantPlanPro).Count(&stats.ProPlanTenants)
	s.db.Model(&model.Tenant{}).Where("plan = ?", model.TenantPlanEnterprise).Count(&stats.EnterprisePlanTenants)
	// 简化：未实现按时间统计，可留空或后续补充
	return &stats, nil
}

// GetTenantUsers 获取租户管理员用户列表
func (s *AdminTenantService) GetTenantUsers(tenantID uint, req admindto.AdminTenantUserListRequest) (*admindto.AdminTenantUserListResponse, error) {
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.Limit <= 0 {
		req.Limit = 10
	}
	offset := (req.Page - 1) * req.Limit

	q := s.db.Model(&model.TenantAdmin{}).Where("tenant_id = ?", tenantID).Preload("User")
	if req.Role != "" {
		q = q.Where("role = ?", req.Role)
	}
	var total int64
	q.Count(&total)
	var records []model.TenantAdmin
	if err := q.Offset(offset).Limit(req.Limit).Order("created_at DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	users := make([]admindto.AdminTenantUser, 0, len(records))
	for _, r := range records {
		users = append(users, admindto.AdminTenantUser{ID: r.UserID, Email: r.User.Email, Nickname: r.User.Nickname, Role: string(r.Role), UserType: "tenant_admin", Status: "active", CreatedAt: r.CreatedAt})
	}
	totalPages := int(math.Ceil(float64(total) / float64(req.Limit)))
	return &admindto.AdminTenantUserListResponse{Users: users, Pagination: admindto.PaginationResponse{Page: req.Page, Limit: req.Limit, Total: total, TotalPages: totalPages}}, nil
}

// RemoveTenantUser 移除租户管理员
func (s *AdminTenantService) RemoveTenantUser(tenantID uint, userID uint) error {
	return s.db.Where("tenant_id = ? AND user_id = ?", tenantID, userID).Delete(&model.TenantAdmin{}).Error
}

// 占位避免未使用导入
var _ = time.Now
