package tenant

import (
	"basaltpass-backend/internal/model"
	tenant2 "basaltpass-backend/internal/service/tenant"

	"github.com/gofiber/fiber/v2"
)

var tenantService = tenant2.NewTenantService()

// GetTenantInfoHandler 获取租户基础信息（租户控制台专用）
// GET /tenant/tenant/info
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

// InviteUserHandler 邀请用户加入租户 （正在开发）
// POST /tenant/tenant/users/invite
func InviteUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	inviterUserID := c.Locals("userID").(uint)

	var req struct {
		UserID uint   `json:"user_id" validate:"required"`
		Role   string `json:"role" validate:"required,oneof=tenant member"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// TODO: 添加权限检查

	if err := tenantService.InviteUserToTenant(tenantID, inviterUserID, req.UserID, model.TenantRole(req.Role)); err != nil {
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

// TenantGetStripeConfigHandler 获取租户 Stripe 配置（脱敏）
// GET /api/v1/tenant/stripe-config
func TenantGetStripeConfigHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	config, err := tenantService.GetTenantStripeConfig(tenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    config,
		"message": "获取 Stripe 配置成功",
	})
}

// TenantUpdateStripeConfigHandler 更新租户 Stripe 配置
// PUT /api/v1/tenant/stripe-config
func TenantUpdateStripeConfigHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var req tenant2.UpdateTenantStripeConfigRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	config, err := tenantService.UpdateTenantStripeConfig(tenantID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    config,
		"message": "更新 Stripe 配置成功",
	})
}

// TenantGetAuthSettingsHandler 获取租户注册/登录开关
// GET /api/v1/tenant/auth-settings
func TenantGetAuthSettingsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	settings, err := tenantService.GetTenantAuthSettings(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    settings,
		"message": "获取租户认证开关成功",
	})
}

// TenantUpdateAuthSettingsHandler 更新租户注册/登录开关
// PUT /api/v1/tenant/auth-settings
func TenantUpdateAuthSettingsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var req tenant2.UpdateTenantAuthSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	settings, err := tenantService.UpdateTenantAuthSettings(tenantID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data":    settings,
		"message": "更新租户认证开关成功",
	})
}
