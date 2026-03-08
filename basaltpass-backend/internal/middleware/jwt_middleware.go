package middleware

import (
	"basaltpass-backend/internal/middleware/authn"

	"github.com/gofiber/fiber/v2"
)

// JWTMiddleware delegates authentication to the layered authn package.
func JWTMiddleware() fiber.Handler {
	return authn.JWTMiddleware()
}
