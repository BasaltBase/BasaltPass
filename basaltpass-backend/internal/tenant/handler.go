package tenant

import (
	"strconv"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

var tenantService = NewTenantService()

// CreateTenantHandler 创建租户（超级管理员）
// POST /_admin/tenants
func CreateTenantHandler(c *fiber.Ctx) error {
	var req CreateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 获取当前用户ID
	userID := c.Locals("userID").(uint)

	tenant, err := tenantService.CreateTenant(userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    tenant,
		"message": "租户创建成功",
	})
}

// ListTenantsHandler 获取租户列表（超级管理员）
// GET /_admin/tenants
func ListTenantsHandler(c *fiber.Ctx) error {
	// 解析分页参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))
	search := c.Query("search", "")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	tenants, total, err := tenantService.ListTenants(page, pageSize, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"tenants":   tenants,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// GetTenantInfoHandler 获取租户基础信息（租户控制台专用）
// GET /admin/tenant/info
func GetTenantInfoHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	info, err := tenantService.GetTenantInfo(tenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    info,
		"message": "获取租户信息成功",
	})
}

// GetTenantHandler 获取租户详情
// GET /_admin/tenants/:id 或 GET /admin/tenant
func GetTenantHandler(c *fiber.Ctx) error {
	var tenantID uint

	// 如果是租户级API，从上下文获取租户ID
	if paramID := c.Params("id"); paramID != "" {
		// 超级管理员API
		id, err := strconv.ParseUint(paramID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的租户ID",
			})
		}
		tenantID = uint(id)
	} else {
		// 租户级API，从上下文获取
		tenantID = c.Locals("tenantID").(uint)
	}

	includeStats := c.QueryBool("include_stats", false)

	tenant, err := tenantService.GetTenant(tenantID, includeStats)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": tenant,
	})
}

// UpdateTenantHandler 更新租户
// PUT /_admin/tenants/:id 或 PUT /admin/tenant
func UpdateTenantHandler(c *fiber.Ctx) error {
	var tenantID uint

	if paramID := c.Params("id"); paramID != "" {
		// 超级管理员API
		id, err := strconv.ParseUint(paramID, 10, 32)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的租户ID",
			})
		}
		tenantID = uint(id)
	} else {
		// 租户级API
		tenantID = c.Locals("tenantID").(uint)
	}

	var req UpdateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	tenant, err := tenantService.UpdateTenant(tenantID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    tenant,
		"message": "租户更新成功",
	})
}

// DeleteTenantHandler 删除租户（超级管理员）
// DELETE /_admin/tenants/:id
func DeleteTenantHandler(c *fiber.Ctx) error {
	tenantID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的租户ID",
		})
	}

	if err := tenantService.DeleteTenant(uint(tenantID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "租户删除成功",
	})
}

// GetUserTenantsHandler 获取用户的租户列表
// GET /user/tenants
func GetUserTenantsHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	tenants, err := tenantService.GetUserTenants(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": tenants,
	})
}

// InviteUserHandler 邀请用户加入租户
// POST /admin/tenant/users/invite
func InviteUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	currentUserID := c.Locals("userID").(uint)

	var req struct {
		UserID uint   `json:"user_id" validate:"required"`
		Role   string `json:"role" validate:"required,oneof=admin member"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	role, err := tenantService.GetMemberRole(tenantID, currentUserID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "无权限邀请用户",
		})
	}

	if role != model.TenantRoleOwner && role != model.TenantRoleAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "无权限邀请用户",
		})
	}

	if err := tenantService.InviteUserToTenant(tenantID, currentUserID, req.UserID, model.TenantRole(req.Role)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户邀请成功",
	})
}

// TenantGetInfoHandler 租户获取自己的信息
// GET /api/v1/tenant/info
func TenantGetInfoHandler(c *fiber.Ctx) error {
	// 从JWT中间件获取租户ID
	tenantID := c.Locals("tenantID").(uint)

	info, err := tenantService.GetTenantInfo(tenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    info,
		"message": "获取租户信息成功",
	})
}
