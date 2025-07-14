package rbac

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
)

// CreateRole inserts new role with description.
func CreateRole(name, desc string) error {
	role := model.Role{Name: name, Description: desc}
	return common.DB().Create(&role).Error
}

// ListRoles returns all roles
func ListRoles() ([]model.Role, error) {
	var roles []model.Role
	err := common.DB().Find(&roles).Error
	return roles, err
}

// AssignRole assigns a role to a user
func AssignRole(userID, roleID uint) error {
	ur := model.UserRole{UserID: userID, RoleID: roleID}
	return common.DB().FirstOrCreate(&ur, ur).Error
}
