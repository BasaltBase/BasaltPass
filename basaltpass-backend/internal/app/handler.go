package app

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

var appService = NewAppService()

// CreateAppHandler 创建应用
// POST /admin/apps
func CreateAppHandler(c *fiber.Ctx) error {
	// 从JWT中获取租户ID
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	var req CreateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	app, err := appService.CreateApp(tenantID, &req)
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

// ListAppsHandler 获取应用列表
// GET /admin/apps
func ListAppsHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

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

	apps, total, err := appService.ListApps(tenantID, page, pageSize, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"apps":      apps,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// GetAppHandler 获取应用详情
// GET /admin/apps/:id
func GetAppHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	app, err := appService.GetApp(tenantID, uint(appID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": app,
	})
}

// UpdateAppHandler 更新应用
// PUT /admin/apps/:id
func UpdateAppHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	var req UpdateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

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

// DeleteAppHandler 删除应用
// DELETE /admin/apps/:id
func DeleteAppHandler(c *fiber.Ctx) error {
	tenantID := getTenantIDFromContext(c)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "无效的租户上下文",
		})
	}

	appID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的应用ID",
		})
	}

	if err := appService.DeleteApp(tenantID, uint(appID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "应用删除成功",
	})
}

// 辅助函数：从上下文获取租户ID
// TODO ⬇️ 实现JWT中租户信息的解析
func getTenantIDFromContext(c *fiber.Ctx) uint {
	// 临时实现：从Header获取租户ID
	tenantID := c.Get("X-Tenant-ID")
	if tenantID == "" {
		return 0
	}

	id, err := strconv.ParseUint(tenantID, 10, 32)
	if err != nil {
		return 0
	}

	return uint(id)
}

// 系统级管理员处理程序（不需要租户上下文）

// AdminListAppsHandler 系统管理员获取所有应用列表
// GET /admin/apps
func AdminListAppsHandler(c *fiber.Ctx) error {
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

	// 获取所有租户的应用（系统管理员权限）
	apps, total, err := appService.AdminListAllApps(page, pageSize, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"apps":        apps,
			"total":       total,
			"page":        page,
			"page_size":   pageSize,
			"total_pages": (int(total) + pageSize - 1) / pageSize,
		},
	})
}

// AdminGetAppHandler 系统管理员获取应用详情
// GET /admin/apps/:id
func AdminGetAppHandler(c *fiber.Ctx) error {
	appID := c.Params("id")
	if appID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "应用ID不能为空",
		})
	}

	app, err := appService.AdminGetApp(appID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": app,
	})
}

// AdminCreateAppHandler 系统管理员创建应用
// POST /admin/apps
func AdminCreateAppHandler(c *fiber.Ctx) error {
	var req AdminCreateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的请求数据",
		})
	}

	// 验证必填字段
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "应用名称不能为空",
		})
	}

	// 如果没有指定租户ID，返回错误（系统管理员必须指定租户）
	if req.TenantID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "必须指定租户ID",
		})
	}

	app, err := appService.AdminCreateApp(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": app,
	})
}

// AdminUpdateAppHandler 系统管理员更新应用
// PUT /admin/apps/:id
func AdminUpdateAppHandler(c *fiber.Ctx) error {
	appID := c.Params("id")
	if appID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "应用ID不能为空",
		})
	}

	var req UpdateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的请求数据",
		})
	}

	app, err := appService.AdminUpdateApp(appID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": app,
	})
}

// AdminDeleteAppHandler 系统管理员删除应用
// DELETE /admin/apps/:id
func AdminDeleteAppHandler(c *fiber.Ctx) error {
	appID := c.Params("id")
	if appID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "应用ID不能为空",
		})
	}

	err := appService.AdminDeleteApp(appID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "应用删除成功",
	})
}
