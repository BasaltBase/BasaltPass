package middleware

import (
	"basaltpass-backend/internal/middleware/authz"

	"github.com/gofiber/fiber/v2"
)

// SuperAdminMiddleware 超级管理员(Basalt 方面)中间件
func SuperAdminMiddleware() fiber.Handler {
	return authz.SuperAdminMiddleware()
}
