package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

// SuperAdminMiddleware 超级管理员(Basalt 方面)中间件
func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Enforce console scope: global admin routes require an "admin" scoped token.
		if scope, _ := c.Locals("scope").(string); scope != "admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "admin console scope required",
			})
		}

		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// Check if user is super admin
		var user model.User
		if err := common.DB().First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "[admin_middleware] User not found",
			})
		}

		if !user.IsSuperAdmin() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "[admin_middleware] Basalt super admin access required",
			})
		}

		return c.Next()
	}
}
