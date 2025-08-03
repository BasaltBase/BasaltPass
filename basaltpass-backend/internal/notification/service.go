package notification

import (
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// Send 发送通知
// appName 系统应用名称，如 "安全中心"
// receiverIDs 为空或包含0 表示全员广播
func Send(appName, title, content, nType string, senderID *uint, senderName string, receiverIDs []uint) error {
	db := common.DB()

	var app model.SystemApp
	if err := db.Where("name = ?", appName).First(&app).Error; err != nil {
		return err
	}

	// 若 receiverIDs 空，则广播
	if len(receiverIDs) == 0 {
		receiverIDs = []uint{0}
	}

	var notifs []model.Notification
	now := time.Now()
	for _, rid := range receiverIDs {
		notifs = append(notifs, model.Notification{
			AppID:      app.ID,
			Title:      title,
			Content:    content,
			Type:       nType,
			SenderID:   senderID,
			SenderName: senderName,
			ReceiverID: rid,
			CreatedAt:  now,
		})
	}
	return db.Create(&notifs).Error
}

// List 返回用户通知（包含全员广播）
func List(userID uint, page, pageSize int) ([]model.Notification, int64, error) {
	db := common.DB()
	var notifs []model.Notification
	var total int64
	db.Model(&model.Notification{}).
		Where("receiver_id = ? OR receiver_id = 0", userID).
		Count(&total)
	err := db.Where("receiver_id = ? OR receiver_id = 0", userID).
		Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Preload("App").
		Find(&notifs).Error
	return notifs, total, err
}

// UnreadCount 未读数量
func UnreadCount(userID uint) (int64, error) {
	db := common.DB()
	var count int64
	err := db.Model(&model.Notification{}).
		Where("(receiver_id = ? OR receiver_id = 0) AND is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

// MarkAsRead 标记单条通知
func MarkAsRead(userID, notifID uint) error {
	db := common.DB()
	return db.Model(&model.Notification{}).
		Where("id = ? AND (receiver_id = ? OR receiver_id = 0)", notifID, userID).
		Updates(map[string]interface{}{"is_read": true, "read_at": time.Now()}).Error
}

// MarkAllAsRead 标记全部已读
func MarkAllAsRead(userID uint) error {
	db := common.DB()
	return db.Model(&model.Notification{}).
		Where("(receiver_id = ? OR receiver_id = 0) AND is_read = ?", userID, false).
		Updates(map[string]interface{}{"is_read": true, "read_at": time.Now()}).Error
}

// Delete 用户删除通知
func Delete(userID, notifID uint) error {
	db := common.DB()
	return db.Where("id = ? AND (receiver_id = ? OR receiver_id = 0)", notifID, userID).Delete(&model.Notification{}).Error
}

// AdminList 管理员获取所有通知
func AdminList(page, pageSize int) ([]model.Notification, int64, error) {
	db := common.DB()
	var notifs []model.Notification
	var total int64
	db.Model(&model.Notification{}).Count(&total)
	err := db.Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Preload("App").
		Find(&notifs).Error
	return notifs, total, err
}

// AdminDelete 管理员删除通知
func AdminDelete(notifID uint) error {
	db := common.DB()
	return db.Delete(&model.Notification{}, notifID).Error
}

// TenantSend 租户发送通知
// 只能向租户内的用户发送通知
func TenantSend(tenantID uint, appName, title, content, nType string, senderID *uint, senderName string, receiverIDs []uint) error {
	db := common.DB()

	// 获取应用信息，如果不存在则创建
	var app model.SystemApp
	if err := db.Where("name = ?", appName).First(&app).Error; err != nil {
		// 如果应用不存在，创建新应用
		app = model.SystemApp{
			Name:        appName,
			Description: "租户自定义应用",
		}
		if err := db.Create(&app).Error; err != nil {
			return err
		}
	}

	// 如果 receiverIDs 为空，则获取租户下所有用户
	if len(receiverIDs) == 0 {
		var tenantUsers []uint
		err := db.Table("tenant_admins").
			Where("tenant_id = ?", tenantID).
			Pluck("user_id", &tenantUsers).Error
		if err != nil {
			return err
		}
		receiverIDs = tenantUsers
	} else {
		// 验证所有接收者都属于当前租户
		var validUsers []uint
		err := db.Table("tenant_admins").
			Where("tenant_id = ? AND user_id IN ?", tenantID, receiverIDs).
			Pluck("user_id", &validUsers).Error
		if err != nil {
			return err
		}
		receiverIDs = validUsers
	}

	if len(receiverIDs) == 0 {
		return nil // 没有有效的接收者
	}

	// 创建通知记录
	var notifs []model.Notification
	now := time.Now()
	for _, rid := range receiverIDs {
		notifs = append(notifs, model.Notification{
			AppID:      app.ID,
			Title:      title,
			Content:    content,
			Type:       nType,
			SenderID:   senderID,
			SenderName: senderName,
			ReceiverID: rid,
			CreatedAt:  now,
		})
	}
	return db.Create(&notifs).Error
}

// TenantList 租户获取已发送的通知列表
func TenantList(tenantID uint, page, pageSize int) ([]model.Notification, int64, error) {
	db := common.DB()
	var notifs []model.Notification
	var total int64

	// 获取租户下所有用户的ID
	var tenantUserIDs []uint
	err := db.Table("tenant_admins").
		Where("tenant_id = ?", tenantID).
		Pluck("user_id", &tenantUserIDs).Error
	if err != nil {
		return notifs, 0, err
	}

	if len(tenantUserIDs) == 0 {
		return notifs, 0, nil
	}

	// 查询发送给租户用户的通知
	query := db.Model(&model.Notification{}).Where("receiver_id IN ?", tenantUserIDs)
	query.Count(&total)

	err = query.Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Preload("App").
		Find(&notifs).Error

	return notifs, total, err
}

// TenantDelete 租户删除通知
func TenantDelete(tenantID, notifID uint) error {
	db := common.DB()

	// 获取租户下所有用户的ID
	var tenantUserIDs []uint
	err := db.Table("tenant_admins").
		Where("tenant_id = ?", tenantID).
		Pluck("user_id", &tenantUserIDs).Error
	if err != nil {
		return err
	}

	if len(tenantUserIDs) == 0 {
		return nil
	}

	// 只能删除发送给租户用户的通知
	return db.Where("id = ? AND receiver_id IN ?", notifID, tenantUserIDs).Delete(&model.Notification{}).Error
}

// TenantGetUsers 获取租户下的用户列表
func TenantGetUsers(tenantID uint, search string) ([]map[string]interface{}, error) {
	db := common.DB()
	var users []map[string]interface{}

	// 查询租户管理员和成员
	query := db.Table("users").
		Select("DISTINCT users.id, users.email, users.phone, users.nickname").
		Joins("JOIN tenant_admins ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where("users.email LIKE ? OR users.phone LIKE ? OR users.nickname LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	err := query.Order("users.email").Find(&users).Error
	return users, err
}

// TenantGetNotification 租户获取通知详情
func TenantGetNotification(tenantID, notifID uint) (*model.Notification, error) {
	db := common.DB()

	// 获取租户下所有用户的ID
	var tenantUserIDs []uint
	err := db.Table("tenant_admins").
		Where("tenant_id = ?", tenantID).
		Pluck("user_id", &tenantUserIDs).Error
	if err != nil {
		return nil, err
	}

	if len(tenantUserIDs) == 0 {
		return nil, fmt.Errorf("租户下没有用户")
	}

	var notif model.Notification
	err = db.Where("id = ? AND receiver_id IN ?", notifID, tenantUserIDs).
		Preload("App").
		First(&notif).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("通知不存在")
		}
		return nil, err
	}

	return &notif, nil
}

// TenantUpdateNotification 租户更新通知
func TenantUpdateNotification(tenantID, notifID uint, title, content, nType string) error {
	db := common.DB()

	// 获取租户下所有用户的ID
	var tenantUserIDs []uint
	err := db.Table("tenant_admins").
		Where("tenant_id = ?", tenantID).
		Pluck("user_id", &tenantUserIDs).Error
	if err != nil {
		return err
	}

	if len(tenantUserIDs) == 0 {
		return fmt.Errorf("租户下没有用户")
	}

	// 只能更新发送给租户用户的通知
	updates := map[string]interface{}{
		"title":   title,
		"content": content,
		"type":    nType,
	}

	result := db.Model(&model.Notification{}).
		Where("id = ? AND receiver_id IN ?", notifID, tenantUserIDs).
		Updates(updates)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("通知不存在或无权限修改")
	}

	return nil
}

// TenantNotificationStats 租户通知统计信息
type TenantNotificationStats struct {
	TotalSent      int64            `json:"total_sent"`
	TotalRead      int64            `json:"total_read"`
	TotalUnread    int64            `json:"total_unread"`
	ReadRate       float64          `json:"read_rate"`
	TypeStats      map[string]int64 `json:"type_stats"`
	RecentActivity []struct {
		Date  string `json:"date"`
		Count int64  `json:"count"`
	} `json:"recent_activity"`
}

// TenantGetNotificationStats 获取租户通知统计信息
func TenantGetNotificationStats(tenantID uint) (*TenantNotificationStats, error) {
	db := common.DB()

	// 获取租户下所有用户的ID
	var tenantUserIDs []uint
	err := db.Table("tenant_admins").
		Where("tenant_id = ?", tenantID).
		Pluck("user_id", &tenantUserIDs).Error
	if err != nil {
		return nil, err
	}

	if len(tenantUserIDs) == 0 {
		return &TenantNotificationStats{}, nil
	}

	stats := &TenantNotificationStats{
		TypeStats: make(map[string]int64),
	}

	// 获取总发送数
	db.Model(&model.Notification{}).
		Where("receiver_id IN ?", tenantUserIDs).
		Count(&stats.TotalSent)

	// 获取已读数
	db.Model(&model.Notification{}).
		Where("receiver_id IN ? AND is_read = ?", tenantUserIDs, true).
		Count(&stats.TotalRead)

	// 计算未读数和读取率
	stats.TotalUnread = stats.TotalSent - stats.TotalRead
	if stats.TotalSent > 0 {
		stats.ReadRate = float64(stats.TotalRead) / float64(stats.TotalSent) * 100
	}

	// 获取按类型统计
	var typeStats []struct {
		Type  string `json:"type"`
		Count int64  `json:"count"`
	}
	db.Model(&model.Notification{}).
		Select("type, COUNT(*) as count").
		Where("receiver_id IN ?", tenantUserIDs).
		Group("type").
		Find(&typeStats)

	for _, stat := range typeStats {
		stats.TypeStats[stat.Type] = stat.Count
	}

	// 获取最近7天的活动统计
	for i := 6; i >= 0; i-- {
		date := time.Now().AddDate(0, 0, -i)
		dateStr := date.Format("2006-01-02")

		var count int64
		db.Model(&model.Notification{}).
			Where("receiver_id IN ? AND DATE(created_at) = ?", tenantUserIDs, dateStr).
			Count(&count)

		stats.RecentActivity = append(stats.RecentActivity, struct {
			Date  string `json:"date"`
			Count int64  `json:"count"`
		}{
			Date:  dateStr,
			Count: count,
		})
	}

	return stats, nil
}
