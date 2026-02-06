package tenant

import (
	"strconv"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// PermissionRequest 创建/更新权限请求
type PermissionRequest struct {
	Code        string `json:"code" validate:"required,min=2,max=100"`
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	Category    string `json:"category" validate:"required,min=1,max=50"`
}

// TenantPermissionResponse 租户权限响应
type TenantPermissionResponse struct {
	ID          uint   `json:"id"`
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
}

// CreateTenantPermission 创建租户权限
// POST /api/v1/tenant/permissions
func CreateTenantPermission(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var req PermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 检查权限代码是否已存在
	var existingPerm model.TenantRbacPermission
	if err := common.DB().Where("code = ? AND tenant_id = ?", req.Code, tenantID).
		First(&existingPerm).Error; err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "权限代码已存在",
		})
	} else if err != gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "检查权限代码失败",
		})
	}

	// 创建权限
	permission := model.TenantRbacPermission{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		TenantID:    tenantID,
	}

	if err := common.DB().Create(&permission).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "创建权限失败",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "权限创建成功",
		"data": TenantPermissionResponse{
			ID:          permission.ID,
			Code:        permission.Code,
			Name:        permission.Name,
			Description: permission.Description,
			Category:    permission.Category,
			CreatedAt:   permission.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   permission.UpdatedAt.Format(time.RFC3339),
		},
	})
}

// GetTenantPermissions 获取租户权限列表
// GET /api/v1/tenant/permissions
func GetTenantPermissions(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	// 分页参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	offset := (page - 1) * pageSize

	// 搜索参数
	search := c.Query("search", "")
	category := c.Query("category", "")

	// 构建查询
	query := common.DB().Where("tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where("code LIKE ? OR name LIKE ? OR description LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if category != "" {
		query = query.Where("category = ?", category)
	}

	// 获取总数
	var total int64
	query.Model(&model.TenantRbacPermission{}).Count(&total)

	// 获取权限列表
	var permissions []model.TenantRbacPermission
	if err := query.Offset(offset).Limit(pageSize).
		Order("created_at DESC").
		Find(&permissions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取权限列表失败",
		})
	}

	// 转换为响应格式
	var permissionResponses []TenantPermissionResponse
	for _, perm := range permissions {
		permissionResponses = append(permissionResponses, TenantPermissionResponse{
			ID:          perm.ID,
			Code:        perm.Code,
			Name:        perm.Name,
			Description: perm.Description,
			Category:    perm.Category,
			CreatedAt:   perm.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   perm.UpdatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"permissions": permissionResponses,
			"pagination": fiber.Map{
				"current":   page,
				"page_size": pageSize,
				"total":     total,
			},
		},
		"message": "获取权限列表成功",
	})
}

// UpdateTenantPermission 更新租户权限
// PUT /api/v1/tenant/permissions/:id
func UpdateTenantPermission(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	permissionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "权限ID无效",
		})
	}

	var req PermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 获取权限
	var permission model.TenantRbacPermission
	if err := common.DB().Where("id = ? AND tenant_id = ?", permissionID, tenantID).
		First(&permission).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "权限不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取权限失败",
		})
	}

	// 如果修改了代码，检查新代码是否已存在
	if req.Code != permission.Code {
		var existingPerm model.TenantRbacPermission
		if err := common.DB().Where("code = ? AND tenant_id = ? AND id != ?",
			req.Code, tenantID, permissionID).
			First(&existingPerm).Error; err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "权限代码已存在",
			})
		} else if err != gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "检查权限代码失败",
			})
		}
	}

	// 更新权限
	permission.Code = req.Code
	permission.Name = req.Name
	permission.Description = req.Description
	permission.Category = req.Category

	if err := common.DB().Save(&permission).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "更新权限失败",
		})
	}

	return c.JSON(fiber.Map{
		"message": "权限更新成功",
		"data": TenantPermissionResponse{
			ID:          permission.ID,
			Code:        permission.Code,
			Name:        permission.Name,
			Description: permission.Description,
			Category:    permission.Category,
			CreatedAt:   permission.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   permission.UpdatedAt.Format(time.RFC3339),
		},
	})
}

// DeleteTenantPermission 删除租户权限
// DELETE /api/v1/tenant/permissions/:id
func DeleteTenantPermission(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	permissionID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "权限ID无效",
		})
	}

	// 检查权限是否存在
	var permission model.TenantRbacPermission
	if err := common.DB().Where("id = ? AND tenant_id = ?", permissionID, tenantID).
		First(&permission).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "权限不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取权限失败",
		})
	}

	// 开始事务
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除角色-权限关联
	if err := tx.Where("permission_id = ?", permissionID).
		Delete(&model.TenantRbacRolePermission{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "删除权限关联失败",
		})
	}

	// 删除用户-权限关联
	if err := tx.Where("permission_id = ? AND tenant_id = ?", permissionID, tenantID).
		Delete(&model.TenantUserRbacPermission{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "删除用户权限关联失败",
		})
	}

	// 删除权限
	if err := tx.Delete(&permission).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "删除权限失败",
		})
	}

	tx.Commit()

	return c.JSON(fiber.Map{
		"message": "权限删除成功",
	})
}

// GetTenantPermissionCategories 获取所有权限分类
// GET /api/v1/tenant/permissions/categories
func GetTenantPermissionCategories(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var categories []string
	if err := common.DB().Model(&model.TenantRbacPermission{}).
		Where("tenant_id = ?", tenantID).
		Distinct("category").
		Pluck("category", &categories).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取权限分类失败",
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"categories": categories,
		},
		"message": "获取权限分类成功",
	})
}

// AddPermissionsToRole 为角色添加权限
// POST /api/v1/tenant/roles/:id/permissions
func AddPermissionsToRole(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "角色ID无效",
		})
	}

	var req struct {
		PermissionIDs []uint `json:"permission_ids" validate:"required"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 检查角色是否存在
	var role model.TenantRbacRole
	if err := common.DB().Where("id = ? AND tenant_id = ?", roleID, tenantID).
		First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "角色不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取角色失败",
		})
	}

	// 检查权限是否都存在
	var permCount int64
	common.DB().Model(&model.TenantRbacPermission{}).
		Where("id IN ? AND tenant_id = ?", req.PermissionIDs, tenantID).
		Count(&permCount)

	if int(permCount) != len(req.PermissionIDs) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "部分权限不存在",
		})
	}

	// 删除现有权限关联
	if err := common.DB().Where("role_id = ?", roleID).
		Delete(&model.TenantRbacRolePermission{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "清除旧权限失败",
		})
	}

	// 添加新的权限关联
	for _, permID := range req.PermissionIDs {
		rolePermission := model.TenantRbacRolePermission{
			RoleID:       uint(roleID),
			PermissionID: permID,
		}
		if err := common.DB().Create(&rolePermission).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "添加权限失败",
			})
		}
	}

	return c.JSON(fiber.Map{
		"message": "权限添加成功",
	})
}

// RemovePermissionFromRole 从角色移除权限
// DELETE /api/v1/tenant/roles/:id/permissions/:permission_id
func RemovePermissionFromRole(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "角色ID无效",
		})
	}

	permissionID, err := strconv.ParseUint(c.Params("permission_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "权限ID无效",
		})
	}

	// 检查角色是否存在
	var role model.TenantRbacRole
	if err := common.DB().Where("id = ? AND tenant_id = ?", roleID, tenantID).
		First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "角色不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取角色失败",
		})
	}

	// 删除权限关联
	result := common.DB().Where("role_id = ? AND permission_id = ?", roleID, permissionID).
		Delete(&model.TenantRbacRolePermission{})

	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "移除权限失败",
		})
	}

	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "权限关联不存在",
		})
	}

	return c.JSON(fiber.Map{
		"message": "权限移除成功",
	})
}

// GetRolePermissions 获取角色的权限列表
// GET /api/v1/tenant/roles/:id/permissions
func GetRolePermissions(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "角色ID无效",
		})
	}

	// 检查角色是否存在
	var role model.TenantRbacRole
	if err := common.DB().Where("id = ? AND tenant_id = ?", roleID, tenantID).
		First(&role).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "角色不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取角色失败",
		})
	}

	// 获取角色的权限
	var permissions []model.TenantRbacPermission
	if err := common.DB().
		Joins("JOIN tenant_rbac_role_permissions ON tenant_rbac_role_permissions.permission_id = tenant_rbac_permissions.id").
		Where("tenant_rbac_role_permissions.role_id = ? AND tenant_rbac_permissions.tenant_id = ?", roleID, tenantID).
		Find(&permissions).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "获取权限列表失败",
		})
	}

	// 转换为响应格式
	var permissionResponses []TenantPermissionResponse
	for _, perm := range permissions {
		permissionResponses = append(permissionResponses, TenantPermissionResponse{
			ID:          perm.ID,
			Code:        perm.Code,
			Name:        perm.Name,
			Description: perm.Description,
			Category:    perm.Category,
			CreatedAt:   perm.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   perm.UpdatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"permissions": permissionResponses,
		},
		"message": "获取权限列表成功",
	})
}
