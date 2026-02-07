package routes

import (
	s2sHandler "basaltpass-backend/internal/handler/s2s"
	"basaltpass-backend/internal/middleware"
	sc "basaltpass-backend/internal/service/scope"

	"github.com/gofiber/fiber/v2"
)

// RegisterS2SRoutes 注册服务间（S2S）专用路由
// 认证：基于 OAuth Client 的 client_id + client_secret
// 权限：默认要求具备 s2s.read scope（可在租户中为Client配置）
func RegisterS2SRoutes(v1 fiber.Router) {
	group := v1.Group("/s2s",
		middleware.ClientAuthMiddleware(),
		middleware.S2SAuditMiddleware(),
		middleware.ClientRateLimitMiddleware(),
	)

	// 基础元信息
	group.Get("/health", s2sHandler.GetHealthHandler)
	group.Get("/me", s2sHandler.GetMeHandler)

	// 用户基础信息
	group.Get("/users/:id", middleware.ClientScopeMiddleware(sc.S2SUserRead), s2sHandler.GetUserByIDHandler)
	group.Get("/users/lookup", middleware.ClientScopeMiddleware(sc.S2SUserRead), s2sHandler.LookupUsersHandler)
	group.Patch("/users/:id", middleware.ClientScopeMiddleware(sc.S2SUserWrite), s2sHandler.PatchUserHandler)

	// 角色与权限（作用域：租户）
	group.Get("/users/:id/roles", middleware.ClientScopeMiddleware(sc.S2SRBACRead), s2sHandler.GetUserRolesHandler)
	group.Get("/users/:id/role-codes", middleware.ClientScopeMiddleware(sc.S2SRBACRead), s2sHandler.GetUserRoleCodesHandler)
	group.Get("/users/:id/permissions", middleware.ClientScopeMiddleware(sc.S2SRBACRead), s2sHandler.GetUserPermissionsHandler)

	// 钱包数据（需要 currency 参数）
	group.Get("/users/:id/wallets", middleware.ClientScopeMiddleware(sc.S2SWalletRead), s2sHandler.GetUserWalletHandler)

	// 用户消息（通知）与商品拥有
	group.Get("/users/:id/messages", middleware.ClientScopeMiddleware(sc.S2SMessagesRead), s2sHandler.GetUserMessagesHandler)
	group.Get("/users/:id/products", middleware.ClientScopeMiddleware(sc.S2SProductsRead), s2sHandler.GetUserPurchasedProductsHandler)
	group.Get("/users/:id/products/:product_id/ownership", middleware.ClientScopeMiddleware(sc.S2SProductsRead), s2sHandler.CheckUserProductOwnershipHandler)
}
