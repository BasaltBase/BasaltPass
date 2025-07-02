package model

import "gorm.io/gorm"

// User represents an authenticated account in the system.
type User struct {
	gorm.Model
	Email        string `gorm:"uniqueIndex;size:128"`
	Phone        string `gorm:"uniqueIndex;size:32"`
	PasswordHash string `gorm:"size:255"`
	Nickname     string `gorm:"size:64"`
	AvatarURL    string `gorm:"size:255"`
}
