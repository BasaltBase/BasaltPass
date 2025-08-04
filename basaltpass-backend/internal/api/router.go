package api

import (
	"basaltpass-backend/internal/api/routes"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes attaches all versioned API routes to the Fiber app.
func RegisterRoutes(app *fiber.App) {

	// API v1 路由
	v1 := app.Group("/api/v1")

	// 注册公开路由（无需认证）
	routes.RegisterPublicRoutes(app)

	// 注册OAuth相关路由
	routes.RegisterOAuthRoutes(app)

	// 注册用户相关路由
	routes.RegisterUserRoutes(v1)

	// 注册租户相关路由
	routes.RegisterTenantRoutes(v1)

	// 注册管理员相关路由
	routes.RegisterAdminRoutes(v1)
}
