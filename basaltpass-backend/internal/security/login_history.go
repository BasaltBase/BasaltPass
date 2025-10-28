package security

import (
	"errors"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// LoginHistoryService 提供登录历史相关的查询与记录能力
type LoginHistoryService struct {
	db *gorm.DB
}

// NewLoginHistoryService 创建一个新的登录历史服务实例
func NewLoginHistoryService(db *gorm.DB) *LoginHistoryService {
	return &LoginHistoryService{db: db}
}

// RecordLoginEvent 记录一次登录行为
func (s *LoginHistoryService) RecordLoginEvent(userID uint, ip, userAgent, status string) error {
	if s == nil || s.db == nil {
		return errors.New("login history service is not initialized")
	}

	entry := &model.LoginHistory{
		UserID:    userID,
		IP:        ip,
		UserAgent: userAgent,
		Status:    status,
	}

	return s.db.Create(entry).Error
}

// ListLoginHistory 查询用户的登录历史并支持分页与排序
func (s *LoginHistoryService) ListLoginHistory(userID uint, page, pageSize int, sortOrder string) ([]model.LoginHistory, int64, error) {
	if s == nil || s.db == nil {
		return nil, 0, errors.New("login history service is not initialized")
	}

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	order := "created_at desc"
	if sortOrder == "asc" {
		order = "created_at asc"
	}

	query := s.db.Model(&model.LoginHistory{}).Where("user_id = ?", userID)

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var records []model.LoginHistory
	if err := query.Order(order).Offset((page - 1) * pageSize).Limit(pageSize).Find(&records).Error; err != nil {
		return nil, 0, err
	}

	return records, total, nil
}

// RecordLoginSuccess 记录一次成功登录（使用默认数据库实例）
func RecordLoginSuccess(userID uint, ip, userAgent string) error {
	svc := NewLoginHistoryService(common.DB())
	return svc.RecordLoginEvent(userID, ip, userAgent, "success")
}
