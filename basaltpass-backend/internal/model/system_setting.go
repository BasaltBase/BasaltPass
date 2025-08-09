package model

import "time"

// SystemSetting stores configurable system-wide settings as key-value pairs.
// Value is stored as JSON string to support complex types.
type SystemSetting struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Key         string    `gorm:"uniqueIndex;size:128;not null" json:"key"`
	Value       string    `gorm:"type:text;not null" json:"value"`
	Category    string    `gorm:"size:64;index" json:"category"`
	Description string    `gorm:"size:255" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
