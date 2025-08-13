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

	if err := tenantService.InviteUserToTenant(tenantID, req.UserID, model.TenantRole(req.Role)); err != nil {
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
