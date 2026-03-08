package middleware

import (
	"basaltpass-backend/internal/middleware/ops"

	"github.com/gofiber/fiber/v2"
)

// MaintenanceMiddleware checks if maintenance mode is enabled
// and blocks non-admin users from accessing the system
func MaintenanceMiddleware() fiber.Handler {
	return ops.MaintenanceMiddleware()
}
