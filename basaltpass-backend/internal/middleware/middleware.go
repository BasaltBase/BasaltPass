package middleware

import (
	"basaltpass-backend/internal/middleware/core"

	"github.com/gofiber/fiber/v2"
)

// Facade wrappers for global middleware registration and error handling.

// ErrorHandler delegates to the layered core package.
func ErrorHandler(c *fiber.Ctx, err error) error {
	return core.ErrorHandler(c, err)
}

// RegisterMiddlewares delegates to the layered core package.
func RegisterMiddlewares(app *fiber.App) {
	core.RegisterMiddlewares(app)
}
