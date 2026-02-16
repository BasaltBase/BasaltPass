package tenant

import (
	"strconv"
	"strings"
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

type CheckTenantPermissionRequest struct {
	UserID          uint     `json:"user_id"`
	PermissionCode  string   `json:"permission_code"`
	PermissionCodes []string `json:"permission_codes"`
}

type ImportTenantPermissionRequest struct {
	Category string   `json:"category"`
	Content  string   `json:"content"`
	Codes    []string `json:"codes"`
	Items    []string `json:"items"`
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

// CheckTenantUserPermissions 检查用户是否拥有租户权限（支持单个/批量）
// POST /api/v1/tenant/permissions/check
func CheckTenantUserPermissions(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	var req CheckTenantPermissionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if req.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id 必填"})
	}

	codes := make([]string, 0, len(req.PermissionCodes)+1)
	if req.PermissionCode != "" {
		codes = append(codes, req.PermissionCode)
	}
	codes = append(codes, req.PermissionCodes...)
	normalizedInput, inputDuplicates := normalizeCodesFromRaw(codesToRaw(codes))
	if len(normalizedInput) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "permission_code(s) 必填"})
	}

	now := time.Now()
	ownedSet := make(map[string]bool)

	var directCodes []string
	if err := common.DB().
		Table("tenant_user_rbac_permissions").
		Select("tenant_rbac_permissions.code").
		Joins("JOIN tenant_rbac_permissions ON tenant_rbac_permissions.id = tenant_user_rbac_permissions.permission_id").
		Where("tenant_user_rbac_permissions.user_id = ? AND tenant_user_rbac_permissions.tenant_id = ?", req.UserID, tenantID).
		Where("tenant_user_rbac_permissions.expires_at IS NULL OR tenant_user_rbac_permissions.expires_at > ?", now).
		Pluck("tenant_rbac_permissions.code", &directCodes).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "查询用户直接权限失败"})
	}
	for _, code := range directCodes {
		ownedSet[code] = true
	}

	var roleCodes []string
	if err := common.DB().
		Table("tenant_user_rbac_roles").
		Select("distinct tenant_rbac_permissions.code").
		Joins("JOIN tenant_rbac_role_permissions ON tenant_rbac_role_permissions.role_id = tenant_user_rbac_roles.role_id").
		Joins("JOIN tenant_rbac_permissions ON tenant_rbac_permissions.id = tenant_rbac_role_permissions.permission_id").
		Where("tenant_user_rbac_roles.user_id = ? AND tenant_user_rbac_roles.tenant_id = ?", req.UserID, tenantID).
		Where("tenant_user_rbac_roles.expires_at IS NULL OR tenant_user_rbac_roles.expires_at > ?", now).
		Pluck("tenant_rbac_permissions.code", &roleCodes).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "查询用户角色权限失败"})
	}
	for _, code := range roleCodes {
		ownedSet[code] = true
	}

	result := make(map[string]bool, len(normalizedInput))
	hasAll := true
	for _, code := range normalizedInput {
		ok := ownedSet[code]
		result[code] = ok
		if !ok {
			hasAll = false
		}
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"user_id":                  req.UserID,
			"tenant_id":                tenantID,
			"permissions":              result,
			"has_all_permissions":      hasAll,
			"input_duplicate_filtered": inputDuplicates,
		},
		"message": "权限校验完成",
	})
}

// ImportTenantPermissions 批量导入租户权限码（支持文本/文件）
// POST /api/v1/tenant/permissions/import
func ImportTenantPermissions(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	contentType := c.Get("Content-Type")

	category := "imported"
	raw := ""
	if strings.HasPrefix(strings.ToLower(contentType), "multipart/form-data") {
		category = c.FormValue("category", "imported")
		var err error
		raw, err = readImportRawContent(c)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "读取导入文件失败"})
		}
	} else {
		var req ImportTenantPermissionRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
		}
		if req.Category != "" {
			category = req.Category
		}
		raw = req.Content
		if raw == "" && len(req.Codes) > 0 {
			raw = codesToRaw(req.Codes)
		}
		if raw == "" && len(req.Items) > 0 {
			raw = codesToRaw(req.Items)
		}
	}

	codes, inputDuplicateCount := normalizeCodesFromRaw(raw)
	if len(codes) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "未解析到可导入的权限码"})
	}

	createdCount := 0
	existingCount := 0
	createdCodes := make([]string, 0, len(codes))
	existingCodes := make([]string, 0)
	now := time.Now()
	for _, code := range codes {
		var existing model.TenantRbacPermission
		err := common.DB().Where("tenant_id = ? AND code = ?", tenantID, code).First(&existing).Error
		if err == nil {
			existingCount++
			existingCodes = append(existingCodes, code)
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查权限码失败"})
		}

		permission := model.TenantRbacPermission{
			Code:        code,
			Name:        code,
			Description: "imported",
			Category:    category,
			TenantID:    tenantID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		if err := common.DB().Create(&permission).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "导入权限码失败"})
		}
		createdCount++
		createdCodes = append(createdCodes, code)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"tenant_id":                tenantID,
			"category":                 category,
			"created_count":            createdCount,
			"existing_count":           existingCount,
			"input_duplicate_filtered": inputDuplicateCount,
			"created_codes":            createdCodes,
			"existing_codes":           existingCodes,
		},
		"message": "权限码导入完成",
	})
}

func codesToRaw(codes []string) string {
	return stringsJoinWithNewline(codes)
}

func stringsJoinWithNewline(items []string) string {
	if len(items) == 0 {
		return ""
	}
	out := items[0]
	for i := 1; i < len(items); i++ {
		out += "\n" + items[i]
	}
	return out
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
