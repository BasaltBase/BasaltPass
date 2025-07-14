package model

import "gorm.io/gorm"

// Permission represents a granular permission code.
type Permission struct {
	gorm.Model
	Code string `gorm:"uniqueIndex;size:64"`
	Desc string `gorm:"size:255"`
}

// RolePermission pivot.
type RolePermission struct {
	RoleID       uint `gorm:"primaryKey"`
	PermissionID uint `gorm:"primaryKey"`
}
