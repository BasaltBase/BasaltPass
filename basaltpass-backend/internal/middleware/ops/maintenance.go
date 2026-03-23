package ops

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/middleware/authn"
	"basaltpass-backend/internal/middleware/transport"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/settings"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// MaintenanceMiddleware checks if maintenance mode is enabled
// and blocks non-admin users from accessing the system
func MaintenanceMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		enabled := settings.GetBool("maintenance.enabled", false)
		if !enabled {
			return c.Next()
		}

		path := c.Path()
		tokenStr := authn.ExtractBearerToken(c)

		if tokenStr != "" {
			_, claims, err := authn.ParseJWTToken(tokenStr, true)
			if err == nil && claims != nil {
				if userID, exists := claims["sub"]; exists {
					uid := uint(0)
					switch typed := userID.(type) {
					case float64:
						uid = uint(typed)
					case string:
						if parsed, parseErr := strconv.ParseUint(strings.TrimSpace(typed), 10, 64); parseErr == nil {
							uid = uint(parsed)
						}
					}

					if uid > 0 {
						var user model.User
						if err := common.DB().First(&user, uid).Error; err == nil {
							if user.IsSuperAdmin() {
								return c.Next()
							}
						}

						var taCount int64
						if err := common.DB().Model(&model.TenantUser{}).
							Where("user_id = ? AND role IN ?", uid, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin}).
							Count(&taCount).Error; err == nil && taCount > 0 {
							return c.Next()
						}
					}
				}
			}
		}

		publicPaths := []string{
			"/api/v1/auth/login",
			"/api/v1/auth/verify-email",
			"/api/v1/auth/reset-password",
			"/api/v1/auth/forgot-password",
			"/api/v1/auth/verify-2fa",
			"/api/v1/auth/refresh",
			"/api/v1/health",
			"/health",
		}

		for _, publicPath := range publicPaths {
			if strings.HasPrefix(path, publicPath) {
				return c.Next()
			}
		}

		message := settings.GetString("maintenance.message", "系统维护中，请稍后访问。")
		return transport.APIErrorResponse(c, fiber.StatusServiceUnavailable, "maintenance_mode_enabled", message)
	}
}
