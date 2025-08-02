package app_rbac

import (
	"strconv"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// AppUser 应用用户信息
type AppUser struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
	Status   string `json:"status"`
}

// GetAppUsers 获取应用用户列表
func GetAppUsers(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 获取应用的所有用户
	var users []AppUser
	err = common.DB().Table("app_users").
		Select("users.id, users.email, users.nickname, app_users.status").
		Joins("JOIN users ON users.id = app_users.user_id").
		Where("app_users.app_id = ?", appID).
		Find(&users).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取用户列表失败"})
	}

	return c.JSON(fiber.Map{"users": users})
}

// GetUserPermissions 获取用户在应用中的权限
func GetUserPermissions(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	userID, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 获取用户直接分配的权限
	var userPermissions []model.AppPermission
	err = common.DB().Table("app_user_permissions").
		Select("app_permissions.*").
		Joins("JOIN app_permissions ON app_permissions.id = app_user_permissions.permission_id").
		Where("app_user_permissions.user_id = ? AND app_user_permissions.app_id = ?", userID, appID).
		Where("app_user_permissions.expires_at IS NULL OR app_user_permissions.expires_at > ?", time.Now()).
		Find(&userPermissions).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取用户权限失败"})
	}

	// 获取用户角色
	var userRoles []model.AppRole
	err = common.DB().Table("app_user_roles").
		Select("app_roles.*").
		Joins("JOIN app_roles ON app_roles.id = app_user_roles.role_id").
		Where("app_user_roles.user_id = ? AND app_user_roles.app_id = ?", userID, appID).
		Where("app_user_roles.expires_at IS NULL OR app_user_roles.expires_at > ?", time.Now()).
		Preload("Permissions").
		Find(&userRoles).Error

	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取用户角色失败"})
	}

	return c.JSON(fiber.Map{
		"permissions": userPermissions,
		"roles":       userRoles,
	})
}

// GrantUserPermissions 授予用户权限
func GrantUserPermissions(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	userID, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	var req GrantPermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)
	currentUserID := c.Locals("userID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 验证权限存在
	var permissions []model.AppPermission
	err = common.DB().Where("id IN ? AND app_id = ?", req.PermissionIDs, appID).Find(&permissions).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证权限失败"})
	}
	if len(permissions) != len(req.PermissionIDs) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "部分权限不存在"})
	}

	// 为用户授予权限
	now := time.Now()
	for _, permissionID := range req.PermissionIDs {
		userPermission := model.AppUserPermission{
			UserID:       uint(userID),
			AppID:        uint(appID),
			PermissionID: permissionID,
			GrantedAt:    now,
			GrantedBy:    currentUserID,
			ExpiresAt:    req.ExpiresAt,
		}

		// 检查是否已经存在
		var existing UserPermission
		err = common.DB().Where("user_id = ? AND app_id = ? AND permission_id = ?", userID, appID, permissionID).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			// 不存在，创建新的
			err = common.DB().Create(&userPermission).Error
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "授予权限失败"})
			}
		} else if err == nil {
			// 已存在，更新过期时间
			existing.ExpiresAt = req.ExpiresAt
			existing.GrantedAt = now
			existing.GrantedBy = currentUserID
			err = common.DB().Save(&existing).Error
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新权限失败"})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查权限状态失败"})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "权限授予成功"})
}

// RevokeUserPermission 撤销用户权限
func RevokeUserPermission(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	userID, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	permissionID, err := strconv.ParseUint(c.Params("permission_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的权限ID"})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 删除用户权限
	err = common.DB().Where("user_id = ? AND app_id = ? AND permission_id = ?", userID, appID, permissionID).Delete(&model.AppUserPermission{}).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "撤销权限失败"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "权限撤销成功"})
}

// AssignUserRoles 分配用户角色
func AssignUserRoles(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	userID, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	var req AssignRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)
	currentUserID := c.Locals("userID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 验证角色存在
	var roles []model.AppRole
	err = common.DB().Where("id IN ? AND app_id = ?", req.RoleIDs, appID).Find(&roles).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证角色失败"})
	}
	if len(roles) != len(req.RoleIDs) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "部分角色不存在"})
	}

	// 为用户分配角色
	now := time.Now()
	for _, roleID := range req.RoleIDs {
		userRole := model.AppUserRole{
			UserID:     uint(userID),
			AppID:      uint(appID),
			RoleID:     roleID,
			AssignedAt: now,
			AssignedBy: currentUserID,
			ExpiresAt:  req.ExpiresAt,
		}

		// 检查是否已经存在
		var existing UserRole
		err = common.DB().Where("user_id = ? AND app_id = ? AND role_id = ?", userID, appID, roleID).First(&existing).Error
		if err == gorm.ErrRecordNotFound {
			// 不存在，创建新的
			err = common.DB().Create(&userRole).Error
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "分配角色失败"})
			}
		} else if err == nil {
			// 已存在，更新过期时间
			existing.ExpiresAt = req.ExpiresAt
			existing.AssignedAt = now
			existing.AssignedBy = currentUserID
			err = common.DB().Save(&existing).Error
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新角色失败"})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查角色状态失败"})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "角色分配成功"})
}

// RevokeUserRole 撤销用户角色
func RevokeUserRole(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	userID, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("role_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 删除用户角色
	err = common.DB().Where("user_id = ? AND app_id = ? AND role_id = ?", userID, appID, roleID).Delete(&model.AppUserRole{}).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "撤销角色失败"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "角色撤销成功"})
}
