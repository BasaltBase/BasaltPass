package model

import "time"

// SystemApp 表示系统级应用（如“安全中心”“团队”等）
// SystemApp means system-level applications (such as "Security Center", "Team", etc.)
// 发送通知时需要指定 AppID，方便前端分类展示。
// When sending notifications, you need to specify AppID to facilitate front-end classification display.

type SystemApp struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"size:64;uniqueIndex;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}
