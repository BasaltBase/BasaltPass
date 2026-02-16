package app

import (
	app2 "basaltpass-backend/internal/service/app"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

/**
* @Description : 租户应用处理器
* @Time : 2025/8/13
* @Author : Henry
 */
var appService = app2.NewAppService()

// 辅助函数：从上下文获取租户ID
func getTenantIDFromContext(c *fiber.Ctx) uint {
	// 从JWT中间件设置的Locals获取租户ID
	if tenantID := c.Locals("tenantID"); tenantID != nil {
		if tid, ok := tenantID.(uint); ok {
			return tid
		}
	}

	return 0
}

// 辅助函数：从上下文获取用户ID
func getUserIDFromContext(c *fiber.Ctx) uint {
	if userID := c.Locals("userID"); userID != nil {
		if uid, ok := userID.(uint); ok {
			return uid
		}
	}

	return 0
}

// TenantListAppsHandler 租户获取应用列表
// GET /api/v1/tenant/apps
func TenantListAppsHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析分页参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search", "")

	// 参数验证
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// 调用服务获取应用列表
	apps, total, err := appService.ListApps(tenantID, page, limit, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 返回结果
	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"apps":  apps,
			"total": total,
			"page":  page,
			"limit": limit,
		},
		"message": "获取应用列表成功",
	})
}

// TenantGetAppHandler 租户获取应用详情
// GET /api/v1/tenant/apps/:id
func TenantGetAppHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析应用ID
	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	// 调用服务获取应用详情
	app, err := appService.GetApp(tenantID, uint(appID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    app,
		"message": "获取应用详情成功",
	})
}

// TenantGetAppStatsHandler 租户获取应用统计信息
// GET /api/v1/tenant/apps/:id/stats
func TenantGetAppStatsHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析应用ID
	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	// 解析统计参数
	period := c.Query("period", "7d") // 7d, 30d, 1y

	// 调用服务获取应用统计信息
	stats, err := appService.GetAppStats(tenantID, uint(appID), period)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    stats,
		"message": "获取应用统计成功",
	})
}

// TenantCreateAppHandler 租户创建应用
// POST /api/v1/tenant/apps
func TenantCreateAppHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	userID := getUserIDFromContext(c)
	if userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的用户上下文",
		})
	}

	var req app2.CreateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 调用服务创建应用
	app, err := appService.CreateApp(tenantID, userID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    app,
		"message": "应用创建成功",
	})
}

// TenantUpdateAppHandler 租户更新应用
// PUT /api/v1/tenant/apps/:id
func TenantUpdateAppHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析应用ID
	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	var req app2.UpdateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 调用服务更新应用
	app, err := appService.UpdateApp(tenantID, uint(appID), &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    app,
		"message": "应用更新成功",
	})
}

// TenantDeleteAppHandler 租户删除应用
// DELETE /api/v1/tenant/apps/:id
func TenantDeleteAppHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析应用ID
	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	// 调用服务删除应用
	err = appService.DeleteApp(tenantID, uint(appID))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "应用删除成功",
	})
}

// TenantToggleAppStatusHandler 租户切换应用状态
// PATCH /api/v1/tenant/apps/:id/status
func TenantToggleAppStatusHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	// 解析应用ID
	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	var req struct {
		Status string `json:"status" validate:"required,oneof=active inactive suspended"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 调用服务切换应用状态
	app, err := appService.ToggleAppStatus(tenantID, uint(appID), req.Status)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    app,
		"message": "应用状态更新成功",
	})
}
