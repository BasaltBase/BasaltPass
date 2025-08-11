package user

import (
	"basaltpass-backend/internal/model"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AdminUserService struct {
	db *gorm.DB
}

func NewAdminUserService(db *gorm.DB) *AdminUserService {
	return &AdminUserService{db: db}
}

// GetUserList 获取用户列表
func (s *AdminUserService) GetUserList(req AdminUserListRequest) (*UserListResponse, error) {
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

	var users []model.User
	var total int64

	query := s.db.Model(&model.User{})

	// 搜索条件
	if req.Search != "" {
		searchPattern := "%" + req.Search + "%"
		query = query.Where("email LIKE ? OR phone LIKE ? OR nickname LIKE ?",
			searchPattern, searchPattern, searchPattern)
	}

	// 状态筛选
	switch req.Status {
	case "active":
		query = query.Where("banned = ?", false)
	case "banned":
		query = query.Where("banned = ?", true)
	case "verified":
		query = query.Where("email_verified = ? AND phone_verified = ?", true, true)
	case "unverified":
		query = query.Where("email_verified = ? OR phone_verified = ?", false, false)
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
	query = query.Preload("TenantMemberships.Tenant").Preload("AppAuthorizations.App")

	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}

	// 转换为响应格式
	userResponses := make([]AdminUserListResponse, len(users))
	for i, user := range users {
		userResponses[i] = s.convertToAdminUserListResponse(user)
	}

	totalPages := int((total + int64(req.Limit) - 1) / int64(req.Limit))

	return &UserListResponse{
		Users: userResponses,
		Pagination: PaginationResponse{
			Page:       req.Page,
			Limit:      req.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

// GetUserDetail 获取用户详情
func (s *AdminUserService) GetUserDetail(userID uint) (*AdminUserDetailResponse, error) {
	var user model.User

	err := s.db.Preload("TenantMemberships.Tenant").
		Preload("AppAuthorizations.App.Tenant").
		Preload("TeamMemberships.Team").
		Preload("Passkeys").
		First(&user, userID).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("用户不存在")
		}
		return nil, err
	}

	response := &AdminUserDetailResponse{
		AdminUserListResponse: s.convertToAdminUserListResponse(user),
	}

	// 获取应用授权信息
	response.AppAuthorizations = s.getAppAuthorizations(user.AppAuthorizations)

	// 获取活动统计
	stats, err := s.getUserActivityStats(userID)
	if err != nil {
		return nil, err
	}
	response.ActivityStats = *stats

	return response, nil
}

// UpdateUser 更新用户信息
func (s *AdminUserService) UpdateUser(userID uint, req UpdateUserRequest) error {
	updates := make(map[string]interface{})

	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Phone != nil {
		updates["phone"] = *req.Phone
	}
	if req.Nickname != nil {
		updates["nickname"] = *req.Nickname
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if req.Banned != nil {
		updates["banned"] = *req.Banned
	}

	if len(updates) == 0 {
		return errors.New("没有可更新的字段")
	}

	return s.db.Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error
}

// BanUser 封禁/解封用户
func (s *AdminUserService) BanUser(userID uint, req BanUserRequest) error {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return err
	}

	// 更新用户状态
	if err := s.db.Model(&user).Update("banned", req.Banned).Error; err != nil {
		return err
	}

	// 记录审计日志
	//action := "解封用户"
	//if req.Banned {
	//	action = "封禁用户"
	//}

	// TODO: 添加审计日志记录
	// auditLog := model.AuditLog{
	// 	Action:     action,
	// 	ObjectType: "user",
	// 	ObjectID:   fmt.Sprintf("%d", userID),
	// 	Details:    req.Reason,
	// 	Comment:    req.Comment,
	// }
	// s.db.Create(&auditLog)

	return nil
}

// DeleteUser 删除用户（软删除）
func (s *AdminUserService) DeleteUser(userID uint) error {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return err
	}

	// 执行软删除
	return s.db.Delete(&user).Error
}

// GetUserStats 获取用户统计数据
func (s *AdminUserService) GetUserStats() (*UserStatsResponse, error) {
	var stats UserStatsResponse

	// 总用户数
	s.db.Model(&model.User{}).Count(&stats.TotalUsers)

	// 活跃用户数（未被封禁）
	s.db.Model(&model.User{}).Where("banned = ?", false).Count(&stats.ActiveUsers)

	// 被封禁用户数
	s.db.Model(&model.User{}).Where("banned = ?", true).Count(&stats.BannedUsers)

	// 已验证用户数（邮箱或手机验证）
	s.db.Model(&model.User{}).Where("email_verified = ? OR phone_verified = ?", true, true).Count(&stats.VerifiedUsers)

	// 启用2FA的用户数
	s.db.Model(&model.User{}).Where("two_fa_enabled = ?", true).Count(&stats.TwoFAEnabledUsers)

	// 今天新用户
	today := time.Now().Truncate(24 * time.Hour)
	s.db.Model(&model.User{}).Where("created_at >= ?", today).Count(&stats.NewUsersToday)

	// 本周新用户
	weekStart := time.Now().AddDate(0, 0, -int(time.Now().Weekday())).Truncate(24 * time.Hour)
	s.db.Model(&model.User{}).Where("created_at >= ?", weekStart).Count(&stats.NewUsersThisWeek)

	// 本月新用户
	monthStart := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.Now().Location())
	s.db.Model(&model.User{}).Where("created_at >= ?", monthStart).Count(&stats.NewUsersThisMonth)

	return &stats, nil
}

// AssignGlobalRole 分配全局角色
func (s *AdminUserService) AssignGlobalRole(userID uint, roleID uint) error {
	// 检查用户是否存在
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return errors.New("用户不存在")
	}

	// 检查角色是否存在（全局角色 tenant_id 为 0 或 NULL）
	var role model.Role
	if err := s.db.Where("id = ? AND (tenant_id = 0 OR tenant_id IS NULL)", roleID).First(&role).Error; err != nil {
		return errors.New("全局角色不存在")
	}

	// 检查是否已经分配
	var existingUserRole model.UserRole
	err := s.db.Where("user_id = ? AND role_id = ?", userID, roleID).First(&existingUserRole).Error
	if err == nil {
		return errors.New("用户已拥有该角色")
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	// 创建用户角色关联
	userRole := model.UserRole{
		UserID: userID,
		RoleID: roleID,
	}

	return s.db.Create(&userRole).Error
}

// RemoveGlobalRole 移除全局角色
func (s *AdminUserService) RemoveGlobalRole(userID uint, roleID uint) error {
	result := s.db.Where("user_id = ? AND role_id = ?", userID, roleID).Delete(&model.UserRole{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("用户没有该角色")
	}
	return nil
}

// 私有方法

// convertToAdminUserListResponse 转换为管理员用户列表响应
func (s *AdminUserService) convertToAdminUserListResponse(user model.User) AdminUserListResponse {
	response := AdminUserListResponse{
		ID:            user.ID,
		Email:         user.Email,
		Phone:         user.Phone,
		Nickname:      user.Nickname,
		AvatarURL:     user.AvatarURL,
		EmailVerified: user.EmailVerified,
		PhoneVerified: user.PhoneVerified,
		TwoFAEnabled:  user.TwoFAEnabled,
		Banned:        user.Banned,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
	}

	// 转换租户成员信息
	response.TenantMemberships = make([]TenantMembership, len(user.TenantMemberships))
	for i, membership := range user.TenantMemberships {
		response.TenantMemberships[i] = TenantMembership{
			TenantID:   membership.TenantID,
			TenantName: membership.Tenant.Name,
			TenantCode: membership.Tenant.Code,
			Role:       string(membership.Role),
			JoinedAt:   membership.CreatedAt,
		}
	}

	// 获取全局角色
	response.GlobalRoles = s.getGlobalRoles(user.ID)

	return response
}

// getGlobalRoles 获取用户的全局角色
func (s *AdminUserService) getGlobalRoles(userID uint) []GlobalRole {
	var roles []model.Role
	s.db.Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND (roles.tenant_id = 0 OR roles.tenant_id IS NULL)", userID).
		Find(&roles)

	globalRoles := make([]GlobalRole, len(roles))
	for i, role := range roles {
		globalRoles[i] = GlobalRole{
			ID:          role.ID,
			Name:        role.Name,
			Code:        role.Code,
			Description: role.Description,
		}
	}

	return globalRoles
}

// getAppAuthorizations 获取应用授权信息
func (s *AdminUserService) getAppAuthorizations(appUsers []model.AppUser) []AppAuthorization {
	authorizations := make([]AppAuthorization, len(appUsers))
	for i, appUser := range appUsers {
		authorizations[i] = AppAuthorization{
			AppID:             appUser.AppID,
			AppName:           appUser.App.Name,
			TenantID:          appUser.App.TenantID,
			TenantName:        appUser.App.Tenant.Name,
			Status:            string(appUser.Status),
			FirstAuthorizedAt: appUser.FirstAuthorizedAt,
			LastActiveAt:      appUser.LastActiveAt,
			Scopes:            appUser.Scopes,
		}
	}
	return authorizations
}

// getUserActivityStats 获取用户活动统计
func (s *AdminUserService) getUserActivityStats(userID uint) (*ActivityStats, error) {
	var stats ActivityStats

	// 获取用户授权的应用总数
	s.db.Model(&model.AppUser{}).Where("user_id = ?", userID).Count(&stats.TotalAppsUsed)

	// 获取活跃应用数（状态为active）
	s.db.Model(&model.AppUser{}).Where("user_id = ? AND status = ?", userID, "active").Count(&stats.ActiveAppsCount)

	// 获取用户加入的团队数
	s.db.Model(&model.TeamMember{}).Where("user_id = ?", userID).Count(&stats.TeamsCount)

	// TODO: 添加订阅统计
	// s.db.Model(&model.Subscription{}).Where("user_id = ?", userID).Count(&stats.SubscriptionsCount)

	// TODO: 添加登录统计
	// 这里需要根据实际的登录日志表来获取
	stats.TotalLogins = 0
	stats.LastLoginAt = nil

	return &stats, nil
}

// CreateUser 创建新用户
func (s *AdminUserService) CreateUser(req AdminCreateUserRequest) (*model.User, error) {
	// 验证必填字段
	if req.Email == "" {
		return nil, errors.New("邮箱不能为空")
	}
	if req.Password == "" {
		return nil, errors.New("密码不能为空")
	}

	// 验证邮箱格式 (简单验证)
	if !strings.Contains(req.Email, "@") {
		return nil, errors.New("邮箱格式不正确")
	}

	// 验证密码长度
	if len(req.Password) < 6 {
		return nil, errors.New("密码长度不能少于6位")
	}

	// 检查邮箱是否已存在
	var existingUser model.User
	if err := s.db.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		return nil, errors.New("邮箱已存在")
	}

	// 如果提供了手机号，检查是否已存在
	if req.Phone != "" {
		if err := s.db.Where("phone = ?", req.Phone).First(&existingUser).Error; err == nil {
			return nil, errors.New("手机号已存在")
		}
	}

	// 加密密码
	passwordHash, err := hashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("密码加密失败: %v", err)
	}

	// 创建用户
	user := model.User{
		Email:         req.Email,
		Phone:         req.Phone,
		PasswordHash:  passwordHash,
		Nickname:      req.Nickname,
		EmailVerified: req.EmailVerified,
		PhoneVerified: req.PhoneVerified,
		Banned:        false,
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("创建用户失败: %v", err)
	}

	// 分配默认角色 (如果指定了角色)
	if len(req.RoleIDs) > 0 {
		for _, roleID := range req.RoleIDs {
			userRole := model.UserRole{
				UserID: user.ID,
				RoleID: roleID,
			}
			s.db.Create(&userRole)
		}
	}

	return &user, nil
}

// hashPassword 加密密码
func hashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}
