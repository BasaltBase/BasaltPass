package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/settings"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// MaintenanceMiddleware checks if maintenance mode is enabled
// and blocks non-admin users from accessing the system
func MaintenanceMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Check if maintenance mode is enabled
		enabled := settings.GetBool("maintenance.enabled", false)
		if !enabled {
			return c.Next()
		}

		// Allow access to specific public endpoints
		path := c.Path()
		publicPaths := []string{
			"/api/v1/auth/login",
			"/api/v1/auth/register",
			"/api/v1/auth/verify-email",
			"/api/v1/auth/reset-password",
			"/api/v1/auth/forgot-password",
			"/api/v1/health",
			"/health",
		}

		for _, publicPath := range publicPaths {
			if strings.HasPrefix(path, publicPath) {
				return c.Next()
			}
		}

		// Check if user is authenticated and is an admin
		userIDVal := c.Locals("userID")
		if userIDVal != nil {
			uid := userIDVal.(uint)

			// Check if user is super admin
			var user model.User
			if err := common.DB().First(&user, uid).Error; err == nil {
				if user.IsSuperAdmin() {
					// Super admins can bypass maintenance mode
					return c.Next()
				}
			}

			// Check if user is tenant admin
			var taCount int64
			if err := common.DB().Model(&model.TenantAdmin{}).
				Where("user_id = ? AND role IN ?", uid, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin}).
				Count(&taCount).Error; err == nil && taCount > 0 {
				// Tenant admins can bypass maintenance mode
				return c.Next()
			}
		}

		// Get maintenance message
		message := settings.GetString("maintenance.message", "系统维护中，请稍后访问。")

		// Return 503 Service Unavailable
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":       "Service Unavailable",
			"message":     message,
			"maintenance": true,
		})
	}
}
