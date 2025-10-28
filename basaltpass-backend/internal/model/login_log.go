package model

import (
	"time"

	"gorm.io/gorm"
)

// LoginLog 记录用户登录活动
type LoginLog struct {
	gorm.Model
	UserID    uint      `gorm:"index;not null"`
	LoggedAt  time.Time `gorm:"index;not null"`
	IP        string    `gorm:"size:64"`
	UserAgent string    `gorm:"size:255"`
	Success   bool      `gorm:"index"`
}

// BeforeCreate 设置默认的 LoggedAt
func (l *LoginLog) BeforeCreate(tx *gorm.DB) error {
	if l.LoggedAt.IsZero() {
		l.LoggedAt = time.Now()
	}
	return nil
}
