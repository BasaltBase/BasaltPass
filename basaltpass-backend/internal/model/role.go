package model

import "gorm.io/gorm"

// Role defines a system role with a set of permissions.
// Permissions can be mapped later; for now only name/description.
type Role struct {
	gorm.Model
	Name        string `gorm:"uniqueIndex;size:64"`
	Description string `gorm:"size:255"`
	Users       []User `gorm:"many2many:user_roles;"`
}
