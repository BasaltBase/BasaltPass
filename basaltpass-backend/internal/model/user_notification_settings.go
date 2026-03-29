package model

import "gorm.io/gorm"

// UserNotificationSettings stores per-user notification preferences.
type UserNotificationSettings struct {
	gorm.Model
	UserID          uint `gorm:"uniqueIndex;not null" json:"user_id"`
	EmailEnabled    bool `gorm:"not null;default:true" json:"email_enabled"`
	SMSEnabled      bool `gorm:"column:sms_enabled;not null;default:false" json:"sms_enabled"`
	PushEnabled     bool `gorm:"not null;default:true" json:"push_enabled"`
	SecurityEnabled bool `gorm:"not null;default:true" json:"security_enabled"`

	User User `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
}

func (UserNotificationSettings) TableName() string {
	return "system_user_notification_settings"
}
