package notification

import (
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
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
