package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

/**
* Basalt JWTMiddleware
* Validates JWT from Authorization header and stores user ID in context.
* For all users with all kinds of roles.
*
 */

// JWTMiddleware validates JWT from Authorization header and stores user ID in context.
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		var tokenStr string

		// 1. Try Authorization header
		authHeader := c.Get("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// Security Hardening: Disabled Cookie fallback to prevent CSRF.
		// All clients (SDKs and Frontend) must use Authorization Header.
		// if tokenStr == "" {
		// 	tokenStr = c.Cookies("access_token")
		// }

		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "[Basalt Auth] missing token"})
		}

		// Parse and validate token
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			// Validate the alg is what you expect:
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrTokenSignatureInvalid
			}
			secret := getJWTSecret()
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "[Basalt Auth] invalid token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "[Basalt Auth] invalid claims"})
		}

		// Store user ID in context
		if userID, exists := claims["sub"]; exists {
			if userIDFloat, ok := userID.(float64); ok {
				c.Locals("userID", uint(userIDFloat))
			}
		}

		// Store tenant ID in context if available
		if tenantID, exists := claims["tid"]; exists {
			if tenantIDFloat, ok := tenantID.(float64); ok {
				c.Locals("tenantID", uint(tenantIDFloat))
			}
		}

		// Store console scope in context if available
		if scope, exists := claims["scp"]; exists {
			if scopeStr, ok := scope.(string); ok {
				c.Locals("scope", scopeStr)
			}
		}

		// Store the full token for other middlewares
		c.Locals("user", token)

		return c.Next()
	}
}
