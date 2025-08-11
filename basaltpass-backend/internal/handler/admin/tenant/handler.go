package tenant

import (
	"strconv"

	"basaltpass-backend/internal/common"

	"github.com/gofiber/fiber/v2"
)

var adminTenantService = NewAdminTenantService(common.DB())

// GetTenantListHandler 获取租户列表
func GetTenantListHandler(c *fiber.Ctx) error {
	// 解析查询参数
	var req AdminTenantListRequest

	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "查询参数错误",
		})
	}

	// 解析分页参数
	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			req.Page = p
		}
	}
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			req.Limit = l
		}
	}

	response, err := adminTenantService.GetTenantList(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// GetTenantDetailHandler 获取租户详情
func GetTenantDetailHandler(c *fiber.Ctx) error {
	tenantID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的租户ID",
		})
	}

	response, err := adminTenantService.GetTenantDetail(uint(tenantID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// CreateTenantHandler 创建租户
func CreateTenantHandler(c *fiber.Ctx) error {
	var req AdminCreateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	tenant, err := adminTenantService.CreateTenant(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 转换为列表响应格式
	response := adminTenantService.convertToAdminTenantListResponse(*tenant)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    response,
		"message": "租户创建成功",
	})
}

// UpdateTenantHandler 更新租户信息
func UpdateTenantHandler(c *fiber.Ctx) error {
	tenantID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的租户ID",
		})
	}

	var req AdminUpdateTenantRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	if err := adminTenantService.UpdateTenant(uint(tenantID), req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "租户更新成功",
	})
}

// DeleteTenantHandler 删除租户
func DeleteTenantHandler(c *fiber.Ctx) error {
	tenantID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的租户ID",
		})
	}

	if err := adminTenantService.DeleteTenant(uint(tenantID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "租户删除成功",
	})
}

// GetTenantStatsHandler 获取租户统计
func GetTenantStatsHandler(c *fiber.Ctx) error {
	stats, err := adminTenantService.GetTenantStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}

// GetTenantUsersHandler 获取租户用户列表
func GetTenantUsersHandler(c *fiber.Ctx) error {
	tenantID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的租户ID",
		})
	}

	// 解析查询参数
	var req AdminTenantUserListRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "查询参数错误",
		})
	}

	// 解析分页参数
	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			req.Page = p
		}
	}
	if limit := c.Query("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil {
			req.Limit = l
		}
	}

	response, err := adminTenantService.GetTenantUsers(uint(tenantID), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// RemoveTenantUserHandler 移除租户用户
func RemoveTenantUserHandler(c *fiber.Ctx) error {
	tenantID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的租户ID",
		})
	}

	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	if err := adminTenantService.RemoveTenantUser(uint(tenantID), uint(userID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户移除成功",
	})
}
