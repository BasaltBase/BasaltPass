package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"fmt"

	"github.com/gofiber/fiber/v2"
)

/*
*
* Basalt AdminMiddleware
* Allows only basalt pass super admins.
* Super admins (is_super_admin = true) are always allowed.
* Tenant admins do not count here.
*
 */

// AdminMiddleware allows only super admins or users who are tenant owners/admins in any tenant.
func AdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		uidVal := c.Locals("userID")
		if uidVal == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthenticated"})
		}
		uid := uidVal.(uint)

		// Check if user is super admin
		var user model.User
		if err := common.DB().First(&user, uid).Error; err == nil {
			if user.IsSuperAdmin() {
				return c.Next()
			}
		}

		// Allow tenant owners/admins (role = owner or tenant) as admins for tenant-scoped admin areas
		var taCount int64
		if err := common.DB().Model(&model.TenantAdmin{}).
			Where("user_id = ? AND role IN ?", uid, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin}).
			Count(&taCount).Error; err != nil {
			fmt.Printf("[AdminMiddleware] tenant admin check error for user %d: %v\n", uid, err)
		}
		if taCount == 0 {
			fmt.Printf("[AdminMiddleware] user %d forbidden: not super admin and no tenant admin role\n", uid)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "admin access required"})
		}
		return c.Next()
	}
}

// SuperAdminMiddleware 超级管理员(Basalt 方面)中间件
func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
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
