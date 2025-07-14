package model

import "time"

// PasswordReset stores verification code for resetting password.
type PasswordReset struct {
	ID        uint   `gorm:"primaryKey"`
	UserID    uint   `gorm:"index"`
	Code      string `gorm:"size:16"`
	ExpiresAt time.Time
}
