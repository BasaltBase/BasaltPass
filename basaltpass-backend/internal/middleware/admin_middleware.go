package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

// AdminMiddleware allows only users with role 'admin'.
func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		uidVal := c.Locals("userID")
		if uidVal == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
		}
		uid := uidVal.(uint)
		var count int64
		common.DB().Model(&model.UserRole{}).
			Joins("JOIN roles ON roles.id = user_roles.role_id AND roles.name = ?", "admin").
			Where("user_roles.user_id = ?", uid).
			Count(&count)
		if count == 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "admin required"})
		}
		return c.Next()
	}
}
