package model

import (
	"time"

	"gorm.io/gorm"
)

// LoginHistory 记录用户的登录活动
type LoginHistory struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"-"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	UserID    uint   `gorm:"index" json:"user_id"`
	IP        string `gorm:"size:64" json:"ip"`
	UserAgent string `gorm:"size:255" json:"user_agent"`
	Status    string `gorm:"size:32" json:"status"`
	Location  string `gorm:"size:255" json:"location,omitempty"`
}
