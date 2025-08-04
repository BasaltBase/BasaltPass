package routes

import (
	"basaltpass-backend/internal/admin"
	appHandler "basaltpass-backend/internal/app"
	"basaltpass-backend/internal/app_user"
	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/notification"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/rbac"
	"basaltpass-backend/internal/subscription"
	"basaltpass-backend/internal/tenant"

	"github.com/gofiber/fiber/v2"
)

// RegisterAdminRoutes 注册系统级管理员路由
func RegisterAdminRoutes(v1 fiber.Router) {
	// 平台级管理API（超级管理员）
	platformGroup := v1.Group("/_admin", middleware.JWTMiddleware(), middleware.SuperAdminMiddleware())

	// 租户管理
	platformTenantGroup := platformGroup.Group("/tenants")
	platformTenantGroup.Post("/", tenant.CreateTenantHandler)      // /_admin/tenants
	platformTenantGroup.Get("/", tenant.ListTenantsHandler)        // /_admin/tenants
	platformTenantGroup.Get("/:id", tenant.GetTenantHandler)       // /_admin/tenants/:id
	platformTenantGroup.Put("/:id", tenant.UpdateTenantHandler)    // /_admin/tenants/:id
	platformTenantGroup.Delete("/:id", tenant.DeleteTenantHandler) // /_admin/tenants/:id

	// 原有的系统级管理员路由（保持向后兼容）
	adminGroup := v1.Group("/admin", middleware.JWTMiddleware(), middleware.AdminMiddleware())

	adminGroup.Get("/dashboard/stats", admin.DashboardStatsHandler)        // /admin/dashboard/stats
	adminGroup.Get("/dashboard/activities", admin.RecentActivitiesHandler) // /admin/dashboard/activities
	adminGroup.Get("/roles", rbac.ListRolesHandler)                        // /admin/roles
	adminGroup.Post("/roles", rbac.CreateRoleHandler)                      // /admin/roles
	adminGroup.Post("/user/:id/role", rbac.AssignRoleHandler)              // /admin/user/:id/role
	adminGroup.Get("/users", admin.ListUsersHandler)                       // /admin/users
	adminGroup.Post("/user/:id/ban", admin.BanUserHandler)                 // /admin/user/:id/ban
	adminGroup.Get("/wallets", admin.ListWalletTxHandler)                  // /admin/wallets
	adminGroup.Post("/tx/:id/approve", admin.ApproveTxHandler)             // /admin/tx/:id/approve
	adminGroup.Get("/logs", admin.ListAuditHandler)                        // /admin/logs

	// OAuth2客户端管理路由（高级管理级）
	oauthClientGroup := adminGroup.Group("/oauth/clients")                                // /admin/oauth/clients
	oauthClientGroup.Post("/", oauth.CreateClientHandler)                                 // /admin/oauth/clients
	oauthClientGroup.Get("/", oauth.ListClientsHandler)                                   // /admin/oauth/clients
	oauthClientGroup.Get("/:client_id", oauth.GetClientHandler)                           // /admin/oauth/clients/:client_id
	oauthClientGroup.Put("/:client_id", oauth.UpdateClientHandler)                        // /admin/oauth/clients/:client_id
	oauthClientGroup.Delete("/:client_id", oauth.DeleteClientHandler)                     // /admin/oauth/clients/:client_id
	oauthClientGroup.Post("/:client_id/regenerate-secret", oauth.RegenerateSecretHandler) // /admin/oauth/clients/:client_id/regenerate-secret
	oauthClientGroup.Get("/:client_id/stats", oauth.GetClientStatsHandler)                // /admin/oauth/clients/:client_id/stats
	oauthClientGroup.Get("/:client_id/tokens", oauth.GetTokensHandler)                    // /admin/oauth/clients/:client_id/tokens
	oauthClientGroup.Post("/:client_id/revoke-tokens", oauth.RevokeClientTokensHandler)   // /admin/oauth/clients/:client_id/revoke-tokens

	// 系统级应用管理
	adminAppGroup := adminGroup.Group("/apps")
	adminAppGroup.Post("/", appHandler.AdminCreateAppHandler)      // /admin/apps
	adminAppGroup.Get("/", appHandler.AdminListAppsHandler)        // /admin/apps
	adminAppGroup.Get("/:id", appHandler.AdminGetAppHandler)       // /admin/apps/:id
	adminAppGroup.Put("/:id", appHandler.AdminUpdateAppHandler)    // /admin/apps/:id
	adminAppGroup.Delete("/:id", appHandler.AdminDeleteAppHandler) // /admin/apps/:id

	// 应用管理
	adminAppGroup.Post("/", appHandler.CreateAppHandler)
	adminAppGroup.Get("/", appHandler.ListAppsHandler)
	adminAppGroup.Get("/:id", appHandler.GetAppHandler)
	adminAppGroup.Put("/:id", appHandler.UpdateAppHandler)
	adminAppGroup.Delete("/:id", appHandler.DeleteAppHandler)
	adminAppGroup.Patch("/:id/status", appHandler.ToggleAppStatusHandler)
	adminAppGroup.Get("/:id/stats", appHandler.GetAppStatsHandler)

	// 应用用户管理路由（租户级）
	adminAppGroup.Get("/:app_id/users", app_user.GetAppUsersHandler)
	adminAppGroup.Get("/:app_id/users/stats", app_user.GetAppUserStatsHandler)
	adminAppGroup.Delete("/:app_id/users/:user_id", app_user.AdminRevokeUserAppHandler)

	// 新增：应用用户状态管理
	adminAppGroup.Put("/:app_id/users/:user_id/status", app_user.UpdateAppUserStatusHandler)
	adminAppGroup.Get("/:app_id/users/by-status", app_user.GetAppUsersByStatusHandler)

	// 管理员通知路由
	adminNotif := adminGroup.Group("/notifications")
	adminNotif.Post("/", notification.AdminCreateHandler)      // /admin/notifications
	adminNotif.Get("/", notification.AdminListHandler)         // /admin/notifications
	adminNotif.Delete("/:id", notification.AdminDeleteHandler) // /admin/notifications/:id

	// ========== 管理员订阅系统路由 ==========
	// 产品管理
	adminProductsGroup := adminGroup.Group("/products")
	adminProductsGroup.Get("/", subscription.AdminListProductsHandler)   // /admin/products
	adminProductsGroup.Get("/:id", subscription.AdminGetProductHandler)  // /admin/products/:id
	adminProductsGroup.Post("/", subscription.CreateProductHandler)      // /admin/products
	adminProductsGroup.Put("/:id", subscription.UpdateProductHandler)    // /admin/products/:id
	adminProductsGroup.Delete("/:id", subscription.DeleteProductHandler) // /admin/products/:id

	// 套餐管理
	adminPlansGroup := adminGroup.Group("/plans")
	adminPlansGroup.Get("/", subscription.AdminListPlansHandler)             // /admin/plans
	adminPlansGroup.Get("/:id", subscription.AdminGetPlanHandler)            // /admin/plans/:id
	adminPlansGroup.Post("/", subscription.CreatePlanHandler)                // /admin/plans
	adminPlansGroup.Put("/:id", subscription.UpdatePlanHandler)              // /admin/plans/:id
	adminPlansGroup.Delete("/:id", subscription.DeletePlanHandler)           // /admin/plans/:id
	adminPlansGroup.Post("/features", subscription.CreatePlanFeatureHandler) // /admin/plans/features

	// 定价管理
	adminPricesGroup := adminGroup.Group("/prices")
	adminPricesGroup.Get("/", subscription.AdminListPricesHandler)   // /admin/prices
	adminPricesGroup.Get("/:id", subscription.AdminGetPriceHandler)  // /admin/prices/:id
	adminPricesGroup.Post("/", subscription.CreatePriceHandler)      // /admin/prices
	adminPricesGroup.Put("/:id", subscription.UpdatePriceHandler)    // /admin/prices/:id
	adminPricesGroup.Delete("/:id", subscription.DeletePriceHandler) // /admin/prices/:id

	// 优惠券管理
	adminCouponsGroup := adminGroup.Group("/coupons")
	adminCouponsGroup.Get("/", subscription.AdminListCouponsHandler)     // /admin/coupons
	adminCouponsGroup.Get("/:code", subscription.AdminGetCouponHandler)  // /admin/coupons/:code
	adminCouponsGroup.Post("/", subscription.CreateCouponHandler)        // /admin/coupons
	adminCouponsGroup.Put("/:code", subscription.UpdateCouponHandler)    // /admin/coupons/:code
	adminCouponsGroup.Delete("/:code", subscription.DeleteCouponHandler) // /admin/coupons/:code

	// 订阅管理
	adminSubscriptionsGroup := adminGroup.Group("/subscriptions")
	adminSubscriptionsGroup.Get("/", subscription.AdminListSubscriptionsHandler)            // /admin/subscriptions
	adminSubscriptionsGroup.Get("/:id", subscription.AdminGetSubscriptionHandler)           // /admin/subscriptions/:id
	adminSubscriptionsGroup.Put("/:id/cancel", subscription.AdminCancelSubscriptionHandler) // /admin/subscriptions/:id/cancel
}
