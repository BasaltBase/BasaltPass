package model

import (
	"time"

	"gorm.io/gorm"
)

// Notification 消息通知
// 当 ReceiverID == 0 时表示全员广播
// SenderID 为空表示系统
// AppID 关联 SystemApp
// Type: info/success/warning/error

type Notification struct {
	ID         uint           `gorm:"primaryKey" json:"id"`
	AppID      uint           `gorm:"index;not null" json:"app_id"`
	App        SystemApp      `gorm:"constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"app"`
	Title      string         `gorm:"size:128;not null" json:"title"`
	Content    string         `gorm:"type:text;not null" json:"content"`
	Type       string         `gorm:"size:16;not null;default:'info'" json:"type"`
	SenderID   *uint          `json:"sender_id"`
	SenderName string         `gorm:"size:64;not null;default:'系统'" json:"sender_name"`
	ReceiverID uint           `gorm:"index;not null;default:0" json:"receiver_id"`
	IsRead     bool           `gorm:"not null;default:false" json:"is_read"`
	ReadAt     *time.Time     `json:"read_at"`
	CreatedAt  time.Time      `json:"created_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}
