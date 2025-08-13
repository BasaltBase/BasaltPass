package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

// AdminMiddleware allows only users with role 'tenant'.
func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		uidVal := c.Locals("userID")
		if uidVal == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
		}
		uid := uidVal.(uint)
		var count int64
		common.DB().Model(&model.UserRole{}).
			Joins("JOIN roles ON roles.id = user_roles.role_id AND roles.code = ?", "tenant").
			Where("user_roles.user_id = ?", uid).
			Count(&count)
		if count == 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant required"})
		}
		return c.Next()
	}
}

// SuperAdminMiddleware 超级管理员(Basalt)中间件
func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// 检查是否为超级管理员
		var user model.User
		if err := common.DB().First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not found",
			})
		}

		if !user.IsSuperAdmin() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Super tenant access required",
			})
		}

		return c.Next()
	}
}
