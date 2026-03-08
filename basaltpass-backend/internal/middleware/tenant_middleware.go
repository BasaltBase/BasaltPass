package middleware

import (
	"basaltpass-backend/internal/middleware/authz"

	"github.com/gofiber/fiber/v2"
)

// TenantMiddleware delegates tenant context authorization to authz layer.
func TenantMiddleware() fiber.Handler {
	return authz.TenantMiddleware()
}

// TenantOwnerMiddleware delegates owner-role authorization to authz layer.
func TenantOwnerMiddleware() fiber.Handler {
	return authz.TenantOwnerMiddleware()
}

// TenantUserMiddleware delegates admin-role authorization to authz layer.
func TenantUserMiddleware() fiber.Handler {
	return authz.TenantUserMiddleware()
}

// GetTenantIDFromContext 从上下文获取租户ID
func GetTenantIDFromContext(c *fiber.Ctx) uint {
	if tenantID := c.Locals("tenantID"); tenantID != nil {
		if tid, ok := tenantID.(uint); ok {
			return tid
		}
	}
	return 0
}

// GetUserIDFromContext 从上下文获取用户ID
func GetUserIDFromContext(c *fiber.Ctx) *uint {
	if userID := c.Locals("userID"); userID != nil {
		if uid, ok := userID.(uint); ok {
			return &uid
		}
	}
	return nil
}
