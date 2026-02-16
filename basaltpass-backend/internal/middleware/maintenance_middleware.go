package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/settings"
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
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

		path := c.Path()
		fmt.Printf("[MaintenanceMiddleware] Checking path: %s\n", path)

		// Try to extract and parse JWT token to check if user is admin first
		// Admins should have full access during maintenance mode
		var tokenStr string
		authHeader := c.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
			fmt.Printf("[MaintenanceMiddleware] Found JWT token\n")
		}

		if tokenStr != "" {
			// Parse token to get user ID (ignore expiration for maintenance mode check)
			token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrTokenSignatureInvalid
				}
				secret := getJWTSecret()
				return []byte(secret), nil
			})

			if err != nil {
				fmt.Printf("[MaintenanceMiddleware] JWT parse error: %v\n", err)
			}

			// Even if token is expired, we can still extract user ID to check admin status
			if token != nil {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					// Extract user ID from token
					if userID, exists := claims["sub"]; exists {
						if userIDFloat, ok := userID.(float64); ok {
							uid := uint(userIDFloat)
							fmt.Printf("[MaintenanceMiddleware] Checking user ID: %d\n", uid)

							// Check if user is super admin
							var user model.User
							if err := common.DB().First(&user, uid).Error; err == nil {
								fmt.Printf("[MaintenanceMiddleware] User found (ID: %d), IsSuperAdmin: %v\n", user.ID, user.IsSuperAdmin())
								if user.IsSuperAdmin() {
									// Super admins can bypass maintenance mode for ALL routes
									fmt.Printf("[MaintenanceMiddleware] Super admin detected, allowing access\n")
									return c.Next()
								}
							} else {
								fmt.Printf("[MaintenanceMiddleware] User lookup error: %v\n", err)
							}

							// Check if user is tenant admin
							var taCount int64
							if err := common.DB().Model(&model.TenantUser{}).
								Where("user_id = ? AND role IN ?", uid, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin}).
								Count(&taCount).Error; err == nil && taCount > 0 {
								// Tenant admins can bypass maintenance mode for ALL routes
								fmt.Printf("[MaintenanceMiddleware] Tenant admin detected, allowing access\n")
								return c.Next()
							}
						}
					}
				}
			}
		} else {
			fmt.Printf("[MaintenanceMiddleware] No JWT token found\n")
		}

		// Allow access to specific public endpoints (authentication flows)
		publicPaths := []string{
			"/api/v1/auth/login",
			"/api/v1/auth/register",
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
