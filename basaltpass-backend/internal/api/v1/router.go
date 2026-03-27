package v1

import (
	routes2 "basaltpass-backend/internal/api/v1/routes"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes attaches all versioned API routes to the Fiber app.
func RegisterRoutes(app *fiber.App) {

	// API v1 路由
	v1 := app.Group("/api/v1")

	// 注册中间件
	v1.Use(middleware.MaintenanceMiddleware())

	// 注册公开路由（无需认证）
	routes2.RegisterPublicRoutes(v1)

	// 注册OAuth相关路由
	routes2.RegisterOAuthRoutes(v1)

	// 初始化路由依赖（用户团队、订阅等）
	routes2.InitRouteDependencies(common.DB())

	// 注册用户控制台前端相关路由
	routes2.RegisterUserRoutes(v1)

	// 注册租户控制台前端相关路由
	routes2.RegisterTenantRoutes(v1)

	// 注册管理员控制台前端相关路由
	routes2.RegisterAdminRoutes(v1)

	// 注册服务间（S2S）路由
	routes2.RegisterS2SRoutes(v1)

	// 注册手动 API（API Key）
	routes2.RegisterManualAPIRoutes(v1)
}
