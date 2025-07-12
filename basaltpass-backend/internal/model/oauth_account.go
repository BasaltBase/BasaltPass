package model

import "gorm.io/gorm"

// OAuthAccount links a user to an external provider account.
type OAuthAccount struct {
	gorm.Model
	UserID     uint   `gorm:"index"`
	Provider   string `gorm:"size:32;index"`
	ProviderID string `gorm:"size:128"`
	User       User   `gorm:"foreignKey:UserID"`
}
