package app_rbac

import (
	"errors"
	"strconv"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// Permission 类型别名，方便使用
type Permission = model.AppPermission
type Role = model.AppRole
type UserPermission = model.AppUserPermission
type UserRole = model.AppUserRole

// CreatePermissionRequest 创建权限请求
type CreatePermissionRequest struct {
	Code        string `json:"code" validate:"required,min=2,max=100"`
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	Category    string `json:"category" validate:"required,min=1,max=50"`
}

// UpdatePermissionRequest 更新权限请求
type UpdatePermissionRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	Category    string `json:"category" validate:"required,min=1,max=50"`
}

// CreateRoleRequest 创建角色请求
type CreateRoleRequest struct {
	Code          string `json:"code" validate:"required,min=2,max=100"`
	Name          string `json:"name" validate:"required,min=1,max=100"`
	Description   string `json:"description" validate:"max=500"`
	PermissionIDs []uint `json:"permission_ids"`
}

// UpdateRoleRequest 更新角色请求
type UpdateRoleRequest struct {
	Name          string `json:"name" validate:"required,min=1,max=100"`
	Description   string `json:"description" validate:"max=500"`
	PermissionIDs []uint `json:"permission_ids"`
}

// GrantPermissionRequest 授予权限请求
type GrantPermissionRequest struct {
	PermissionIDs []uint     `json:"permission_ids" validate:"required"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty"`
}

// AssignRoleRequest 分配角色请求
type AssignRoleRequest struct {
	RoleIDs   []uint     `json:"role_ids" validate:"required"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// GetAppPermissions 获取应用权限列表
func GetAppPermissions(c *fiber.Ctx) error {
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

	var permissions []Permission
	err = common.DB().Where("app_id = ?", appID).Order("category, name").Find(&permissions).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取权限列表失败"})
	}

	return c.JSON(fiber.Map{"permissions": permissions})
}

// CreateAppPermission 创建应用权限
func CreateAppPermission(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	var req CreatePermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 检查权限代码是否重复
	var existingPermission Permission
	err = common.DB().Where("app_id = ? AND code = ?", appID, req.Code).First(&existingPermission).Error
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "权限代码已存在"})
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查权限代码失败"})
	}

	permission := Permission{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		AppID:       uint(appID),
		TenantID:    tenantID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err = common.DB().Create(&permission).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "创建权限失败"})
	}

	return c.Status(fiber.StatusCreated).JSON(permission)
}

// UpdateAppPermission 更新应用权限
func UpdateAppPermission(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	permissionID, err := strconv.ParseUint(c.Params("permission_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的权限ID"})
	}

	var req UpdatePermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证权限存在且属于当前租户和应用
	var permission Permission
	err = common.DB().Where("id = ? AND app_id = ? AND tenant_id = ?", permissionID, appID, tenantID).First(&permission).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "权限不存在"})
	}

	// 更新权限
	permission.Name = req.Name
	permission.Description = req.Description
	permission.Category = req.Category
	permission.UpdatedAt = time.Now()

	err = common.DB().Save(&permission).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新权限失败"})
	}

	return c.JSON(permission)
}

// DeleteAppPermission 删除应用权限
func DeleteAppPermission(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	permissionID, err := strconv.ParseUint(c.Params("permission_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的权限ID"})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证权限存在且属于当前租户和应用
	var permission Permission
	err = common.DB().Where("id = ? AND app_id = ? AND tenant_id = ?", permissionID, appID, tenantID).First(&permission).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "权限不存在"})
	}

	// 删除权限（会级联删除相关的角色权限和用户权限）
	err = common.DB().Delete(&permission).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "删除权限失败"})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}

// GetAppRoles 获取应用角色列表
func GetAppRoles(c *fiber.Ctx) error {
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

	var roles []Role
	err = common.DB().Preload("Permissions").Where("app_id = ?", appID).Order("name").Find(&roles).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取角色列表失败"})
	}

	return c.JSON(fiber.Map{"roles": roles})
}

// CreateAppRole 创建应用角色
func CreateAppRole(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	var req CreateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证应用属于当前租户
	var app model.App
	err = common.DB().Where("id = ? AND tenant_id = ?", appID, tenantID).First(&app).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "应用不存在"})
	}

	// 检查角色代码是否重复
	var existingRole Role
	err = common.DB().Where("app_id = ? AND code = ?", appID, req.Code).First(&existingRole).Error
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "角色代码已存在"})
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查角色代码失败"})
	}

	// 验证权限ID
	var permissions []Permission
	if len(req.PermissionIDs) > 0 {
		err = common.DB().Where("id IN ? AND app_id = ?", req.PermissionIDs, appID).Find(&permissions).Error
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证权限失败"})
		}
		if len(permissions) != len(req.PermissionIDs) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "部分权限不存在"})
		}
	}

	role := Role{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		AppID:       uint(appID),
		TenantID:    tenantID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err = common.DB().Create(&role).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "创建角色失败"})
	}

	// 关联权限
	if len(permissions) > 0 {
		err = common.DB().Model(&role).Association("Permissions").Append(permissions)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "关联权限失败"})
		}
	}

	// 重新加载权限
	common.DB().Preload("Permissions").First(&role, role.ID)

	return c.Status(fiber.StatusCreated).JSON(role)
}

// UpdateAppRole 更新应用角色
func UpdateAppRole(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("role_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	var req UpdateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证角色存在且属于当前租户和应用
	var role Role
	err = common.DB().Where("id = ? AND app_id = ? AND tenant_id = ?", roleID, appID, tenantID).First(&role).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "角色不存在"})
	}

	// 验证权限ID
	var permissions []Permission
	if len(req.PermissionIDs) > 0 {
		err = common.DB().Where("id IN ? AND app_id = ?", req.PermissionIDs, appID).Find(&permissions).Error
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证权限失败"})
		}
		if len(permissions) != len(req.PermissionIDs) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "部分权限不存在"})
		}
	}

	// 更新角色基本信息
	role.Name = req.Name
	role.Description = req.Description
	role.UpdatedAt = time.Now()

	err = common.DB().Save(&role).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新角色失败"})
	}

	// 更新权限关联
	err = common.DB().Model(&role).Association("Permissions").Replace(permissions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新权限关联失败"})
	}

	// 重新加载权限
	common.DB().Preload("Permissions").First(&role, role.ID)

	return c.JSON(role)
}

// DeleteAppRole 删除应用角色
func DeleteAppRole(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的应用ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("role_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	tenantID := c.Locals("tenantID").(uint)

	// 验证角色存在且属于当前租户和应用
	var role Role
	err = common.DB().Where("id = ? AND app_id = ? AND tenant_id = ?", roleID, appID, tenantID).First(&role).Error
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "角色不存在"})
	}

	// 删除角色（会级联删除相关的权限关联和用户角色）
	err = common.DB().Delete(&role).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "删除角色失败"})
	}

	return c.Status(fiber.StatusNoContent).Send(nil)
}
