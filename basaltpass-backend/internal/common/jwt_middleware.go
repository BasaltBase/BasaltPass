package common

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWTMiddleware validates JWT from Authorization header and stores user ID in context.
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing token"})
		}
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")

		// Parse and validate token
		token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
			// 获取JWT密钥
			secret := getJWTSecret()
			return []byte(secret), nil
		})
		
		if err != nil || !token.Valid {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid token"})
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid claims"})
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

		// Store the full token for other middlewares
		c.Locals("user", token)

		return c.Next()
	}
}
