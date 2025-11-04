package routes

import (
	s2sHandler "basaltpass-backend/internal/handler/s2s"
	"basaltpass-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// RegisterS2SRoutes 注册服务间（S2S）专用路由
// 认证：基于 OAuth Client 的 client_id + client_secret
// 权限：默认要求具备 s2s.read scope（可在租户中为Client配置）
func RegisterS2SRoutes(v1 fiber.Router) {
	group := v1.Group("/s2s", middleware.ClientAuthMiddleware("s2s.read"))

	// 用户基础信息
	group.Get("/users/:id", s2sHandler.GetUserByIDHandler)

	// 角色与权限（作用域：租户）
	group.Get("/users/:id/roles", s2sHandler.GetUserRolesHandler)
	group.Get("/users/:id/permissions", s2sHandler.GetUserPermissionsHandler)

	// 钱包数据（需要 currency 参数）
	group.Get("/users/:id/wallets", s2sHandler.GetUserWalletHandler)
}
