package model

import "gorm.io/gorm"

// AuditLog stores sensitive operation logs for security auditing.
type AuditLog struct {
	gorm.Model
	UserID    uint   `gorm:"index"`
	Action    string `gorm:"size:64"`
	IP        string `gorm:"size:64"`
	UserAgent string `gorm:"size:255"`
	Data      string `gorm:"type:text"` // arbitrary JSON or text payload
	User      User   `gorm:"foreignKey:UserID"`
}
