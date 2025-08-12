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

// HasRole 检查用户是否具有指定的角色
func HasRole(userID, roleID uint) (bool, error) {
	var count int64
	err := common.DB().Model(&model.UserRole{}).
		Where("user_id = ? AND role_id = ?", userID, roleID).
		Count(&count).Error
	return count > 0, err
}

// HasRoleByCode 通过角色代码检查用户是否具有指定角色
func HasRoleByCode(userID uint, tenantID uint, roleCode string) (bool, error) {
	var count int64
	err := common.DB().Table("user_roles").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ? AND roles.code = ?", userID, tenantID, roleCode).
		Count(&count).Error
	return count > 0, err
}

// HasAnyRole 检查用户是否具有任意一个指定的角色
func HasAnyRole(userID uint, roleIDs []uint) (bool, error) {
	if len(roleIDs) == 0 {
		return false, nil
	}

	var count int64
	err := common.DB().Model(&model.UserRole{}).
		Where("user_id = ? AND role_id IN (?)", userID, roleIDs).
		Count(&count).Error
	return count > 0, err
}

// GetUserRoles 获取用户的所有角色
func GetUserRoles(userID uint, tenantID uint) ([]model.Role, error) {
	var roles []model.Role
	err := common.DB().
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ?", userID, tenantID).
		Preload("App").
		Find(&roles).Error
	return roles, err
}

// GetUserRoleCodes 获取用户的所有角色代码
func GetUserRoleCodes(userID uint, tenantID uint) ([]string, error) {
	var codes []string
	err := common.DB().Table("user_roles").
		Select("roles.code").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ?", userID, tenantID).
		Pluck("roles.code", &codes).Error
	return codes, err
}

// RemoveRole 移除用户的角色
func RemoveRole(userID, roleID uint) error {
	return common.DB().Where("user_id = ? AND role_id = ?", userID, roleID).
		Delete(&model.UserRole{}).Error
}

// CheckPermission 检查用户是否有特定权限（通过角色）
func CheckPermission(userID uint, tenantID uint, permissionCode string) (bool, error) {
	var count int64
	err := common.DB().Table("user_roles").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Joins("JOIN role_permissions ON roles.id = role_permissions.role_id").
		Joins("JOIN permissions ON role_permissions.permission_id = permissions.id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ? AND permissions.code = ?", userID, tenantID, permissionCode).
		Count(&count).Error
	return count > 0, err
}
