package app_user

import (
	"basaltpass-backend/internal/model"
	"errors"
	"time"

	"gorm.io/gorm"
)

type AppUserService struct {
	db *gorm.DB
}

func NewAppUserService(db *gorm.DB) *AppUserService {
	return &AppUserService{db: db}
}

// RecordUserAppAuthorization 记录用户对应用的授权
func (s *AppUserService) RecordUserAppAuthorization(appID, userID uint, scopes string) error {
	// 检查用户是否已经授权过该应用
	var existingAuth model.AppUser
	err := s.db.Where("app_id = ? AND user_id = ?", appID, userID).First(&existingAuth).Error

	if err == nil {
		// 已存在，更新最后授权时间和权限范围
		updates := map[string]interface{}{
			"last_authorized_at": time.Now(),
			"last_active_at":     time.Now(),
		}
		if scopes != "" {
			updates["scopes"] = scopes
		}
		return s.db.Model(&existingAuth).Updates(updates).Error
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		// 不存在，创建新记录
		now := time.Now()
		appUser := model.AppUser{
			AppID:             appID,
			UserID:            userID,
			FirstAuthorizedAt: now,
			LastAuthorizedAt:  now,
			LastActiveAt:      &now,
			Scopes:            scopes,
		}
		return s.db.Create(&appUser).Error
	}

	return err
}

// UpdateUserLastActivity 更新用户最后活跃时间
func (s *AppUserService) UpdateUserLastActivity(appID, userID uint) error {
	now := time.Now()
	return s.db.Model(&model.AppUser{}).
		Where("app_id = ? AND user_id = ?", appID, userID).
		Update("last_active_at", now).Error
}

// GetAppUsers 获取应用的用户列表
func (s *AppUserService) GetAppUsers(appID uint, page, limit int) ([]*AppUserResponse, int64, error) {
	var total int64
	if err := s.db.Model(&model.AppUser{}).Where("app_id = ?", appID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var appUsers []model.AppUser
	err := s.db.Preload("User").
		Where("app_id = ?", appID).
		Order("last_authorized_at DESC").
		Offset((page - 1) * limit).
		Limit(limit).
		Find(&appUsers).Error

	if err != nil {
		return nil, 0, err
	}

	responses := make([]*AppUserResponse, len(appUsers))
	for i, au := range appUsers {
		responses[i] = &AppUserResponse{
			ID:                au.ID,
			AppID:             au.AppID,
			UserID:            au.UserID,
			UserEmail:         au.User.Email,
			UserNickname:      au.User.Nickname,
			FirstAuthorizedAt: au.FirstAuthorizedAt,
			LastAuthorizedAt:  au.LastAuthorizedAt,
			LastActiveAt:      au.LastActiveAt,
			Scopes:            au.Scopes,
		}
	}

	return responses, total, nil
}

// GetUserApps 获取用户授权的应用列表
func (s *AppUserService) GetUserApps(userID uint) ([]*UserAppResponse, error) {
	var appUsers []model.AppUser
	err := s.db.Preload("App").
		Where("user_id = ?", userID).
		Order("last_authorized_at DESC").
		Find(&appUsers).Error

	if err != nil {
		return nil, err
	}

	responses := make([]*UserAppResponse, len(appUsers))
	for i, au := range appUsers {
		responses[i] = &UserAppResponse{
			ID:                au.ID,
			AppID:             au.AppID,
			AppName:           au.App.Name,
			AppDescription:    au.App.Description,
			AppIconURL:        au.App.IconURL,
			FirstAuthorizedAt: au.FirstAuthorizedAt,
			LastAuthorizedAt:  au.LastAuthorizedAt,
			LastActiveAt:      au.LastActiveAt,
			Scopes:            au.Scopes,
		}
	}

	return responses, nil
}

// RevokeUserAppAuthorization 撤销用户对应用的授权
func (s *AppUserService) RevokeUserAppAuthorization(appID, userID uint) error {
	return s.db.Where("app_id = ? AND user_id = ?", appID, userID).Delete(&model.AppUser{}).Error
}

// GetAppUserStats 获取应用用户统计信息
func (s *AppUserService) GetAppUserStats(appID uint) (*AppUserStats, error) {
	stats := &AppUserStats{}

	// 总用户数
	if err := s.db.Model(&model.AppUser{}).Where("app_id = ?", appID).Count(&stats.TotalUsers).Error; err != nil {
		return nil, err
	}

	// 活跃用户数（30天内有活动）
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)
	if err := s.db.Model(&model.AppUser{}).
		Where("app_id = ? AND last_active_at > ?", appID, thirtyDaysAgo).
		Count(&stats.ActiveUsers).Error; err != nil {
		return nil, err
	}

	// 新用户数（30天内首次授权）
	if err := s.db.Model(&model.AppUser{}).
		Where("app_id = ? AND first_authorized_at > ?", appID, thirtyDaysAgo).
		Count(&stats.NewUsers).Error; err != nil {
		return nil, err
	}

	return stats, nil
}

// AppUserResponse 应用用户响应结构
type AppUserResponse struct {
	ID                uint       `json:"id"`
	AppID             uint       `json:"app_id"`
	UserID            uint       `json:"user_id"`
	UserEmail         string     `json:"user_email"`
	UserNickname      string     `json:"user_nickname"`
	FirstAuthorizedAt time.Time  `json:"first_authorized_at"`
	LastAuthorizedAt  time.Time  `json:"last_authorized_at"`
	LastActiveAt      *time.Time `json:"last_active_at"`
	Scopes            string     `json:"scopes"`
}

// UserAppResponse 用户应用响应结构
type UserAppResponse struct {
	ID                uint       `json:"id"`
	AppID             uint       `json:"app_id"`
	AppName           string     `json:"app_name"`
	AppDescription    string     `json:"app_description"`
	AppIconURL        string     `json:"app_icon_url"`
	FirstAuthorizedAt time.Time  `json:"first_authorized_at"`
	LastAuthorizedAt  time.Time  `json:"last_authorized_at"`
	LastActiveAt      *time.Time `json:"last_active_at"`
	Scopes            string     `json:"scopes"`
}

// AppUserStats 应用用户统计信息
type AppUserStats struct {
	TotalUsers  int64 `json:"total_users"`
	ActiveUsers int64 `json:"active_users"`
	NewUsers    int64 `json:"new_users"`
}
