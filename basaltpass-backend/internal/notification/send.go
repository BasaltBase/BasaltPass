package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"time"
)

// Send 发送通知（通用）；receiverIDs 为空表示广播（receiver_id=0）
func Send(appName, title, content, nType string, senderID *uint, senderName string, receiverIDs []uint) error {
	db := common.DB()
	var app model.SystemApp
	if err := db.Where("name = ?", appName).First(&app).Error; err != nil {
		return err
	}
	if len(receiverIDs) == 0 {
		receiverIDs = []uint{0}
	}
	now := time.Now()
	notifs := make([]model.Notification, 0, len(receiverIDs))
	for _, rid := range receiverIDs {
		notifs = append(notifs, model.Notification{AppID: app.ID, Title: title, Content: content, Type: nType, SenderID: senderID, SenderName: senderName, ReceiverID: rid, CreatedAt: now})
	}
	return db.Create(&notifs).Error
}
