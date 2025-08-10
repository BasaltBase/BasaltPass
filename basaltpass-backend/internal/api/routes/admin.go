package routes

import (
	"basaltpass-backend/internal/admin"
	adminNotification "basaltpass-backend/internal/admin/notification"
	adminSettings "basaltpass-backend/internal/admin/settings"
	adminTeam "basaltpass-backend/internal/admin/team"
	adminTenant "basaltpass-backend/internal/admin/tenant"
	adminUser "basaltpass-backend/internal/admin/user"
	adminWallet "basaltpass-backend/internal/admin/wallet"
	"basaltpass-backend/internal/middleware"
	appHandler "basaltpass-backend/internal/public/app"
	"basaltpass-backend/internal/public/app/app_user"
	"basaltpass-backend/internal/public/oauth"
	rbac2 "basaltpass-backend/internal/public/rbac"
	"basaltpass-backend/internal/public/subscription"
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
	adminGroup.Get("/roles", rbac2.ListRolesHandler)                       // /admin/roles
	adminGroup.Post("/roles", rbac2.CreateRoleHandler)                     // /admin/roles
	adminGroup.Post("/user/:id/role", rbac2.AssignRoleHandler)             // /admin/user/:id/role

	// 权限管理（系统级）
	adminPermGroup := adminGroup.Group("/permissions")
	adminPermGroup.Get("/", rbac2.ListPermissionsHandler)        // /admin/permissions
	adminPermGroup.Post("/", rbac2.CreatePermissionHandler)      // /admin/permissions
	adminPermGroup.Put("/:id", rbac2.UpdatePermissionHandler)    // /admin/permissions/:id
	adminPermGroup.Delete("/:id", rbac2.DeletePermissionHandler) // /admin/permissions/:id

	// 角色-权限管理
	adminGroup.Get("/roles/:id/permissions", rbac2.GetRolePermissionsHandler)                     // /admin/roles/:id/permissions
	adminGroup.Post("/roles/:id/permissions", rbac2.SetRolePermissionsHandler)                    // /admin/roles/:id/permissions
	adminGroup.Delete("/roles/:id/permissions/:permission_id", rbac2.RemoveRolePermissionHandler) // /admin/roles/:id/permissions/:permission_id

	// 新的用户管理路由（替换原有的用户相关路由）
	adminUserGroup := adminGroup.Group("/users")
	adminUserGroup.Get("/", adminUser.ListUsersHandler)                             // /admin/users
	adminUserGroup.Post("/", adminUser.CreateUserHandler)                           // /admin/users
	adminUserGroup.Get("/stats", adminUser.GetUserStatsHandler)                     // /admin/users/stats
	adminUserGroup.Get("/:id", adminUser.GetUserHandler)                            // /admin/users/:id
	adminUserGroup.Put("/:id", adminUser.UpdateUserHandler)                         // /admin/users/:id
	adminUserGroup.Delete("/:id", adminUser.DeleteUserHandler)                      // /admin/users/:id
	adminUserGroup.Post("/:id/ban", adminUser.BanUserHandler)                       // /admin/users/:id/ban
	adminUserGroup.Post("/:id/roles", adminUser.AssignGlobalRoleHandler)            // /admin/users/:id/roles
	adminUserGroup.Delete("/:id/roles/:role_id", adminUser.RemoveGlobalRoleHandler) // /admin/users/:id/roles/:role_id

	// 新的租户管理路由
	adminTenantGroup := adminGroup.Group("/tenants")
	adminTenantGroup.Get("/", adminTenant.GetTenantListHandler)       // /admin/tenants
	adminTenantGroup.Post("/", adminTenant.CreateTenantHandler)       // /admin/tenants
	adminTenantGroup.Get("/stats", adminTenant.GetTenantStatsHandler) // /admin/tenants/stats
	adminTenantGroup.Get("/:id", adminTenant.GetTenantDetailHandler)  // /admin/tenants/:id
	adminTenantGroup.Put("/:id", adminTenant.UpdateTenantHandler)     // /admin/tenants/:id
	adminTenantGroup.Delete("/:id", adminTenant.DeleteTenantHandler)  // /admin/tenants/:id

	// 租户用户管理
	adminTenantGroup.Get("/:id/users", adminTenant.GetTenantUsersHandler)              // /admin/tenants/:id/users
	adminTenantGroup.Delete("/:id/users/:userId", adminTenant.RemoveTenantUserHandler) // /admin/tenants/:id/users/:userId

	// 钱包管理路由
	walletHandler := adminWallet.NewAdminWalletHandler()
	adminWalletGroup := adminGroup.Group("/wallets")
	adminWalletGroup.Get("/", walletHandler.ListWallets)                           // /admin/wallets
	adminWalletGroup.Post("/", walletHandler.CreateWallet)                         // /admin/wallets
	adminWalletGroup.Get("/stats", walletHandler.GetWalletStats)                   // /admin/wallets/stats
	adminWalletGroup.Get("/:id/transactions", walletHandler.GetWalletTransactions) // /admin/wallets/:id/transactions
	adminWalletGroup.Post("/:id/adjust", walletHandler.AdjustBalance)              // /admin/wallets/:id/adjust
	adminWalletGroup.Post("/:id/freeze", walletHandler.FreezeWallet)               // /admin/wallets/:id/freeze
	adminWalletGroup.Post("/:id/unfreeze", walletHandler.UnfreezeWallet)           // /admin/wallets/:id/unfreeze
	adminWalletGroup.Delete("/:id", walletHandler.DeleteWallet)                    // /admin/wallets/:id

	// 用户钱包管理
	adminGroup.Get("/users/:id/wallets", walletHandler.GetUserWallets) // /admin/users/:id/wallets

	// 团队钱包管理
	adminGroup.Get("/teams/:id/wallets", walletHandler.GetTeamWallets) // /admin/teams/:id/wallets
	// 团队管理
	adminTeamGroup := adminGroup.Group("/teams")
	adminTeamGroup.Get("/", adminTeam.ListTeamsHandler)
	adminTeamGroup.Get("/:id", adminTeam.GetTeamHandler)
	adminTeamGroup.Put("/:id", adminTeam.UpdateTeamHandler)
	adminTeamGroup.Delete("/:id", adminTeam.DeleteTeamHandler)
	adminTeamGroup.Get("/:id/members", adminTeam.ListMembersHandler)
	adminTeamGroup.Post("/:id/members", adminTeam.AddMemberHandler)
	adminTeamGroup.Delete("/:id/members/:user_id", adminTeam.RemoveMemberHandler)
	adminTeamGroup.Post("/:id/transfer/:new_owner_id", adminTeam.TransferOwnershipHandler)
	adminTeamGroup.Post("/:id/active", adminTeam.ToggleActiveHandler)

	// 货币管理
	adminGroup.Get("/currencies", walletHandler.GetCurrencies) // /admin/currencies

	// 保留原有的钱包交易审批路由（向后兼容）
	adminGroup.Get("/wallet-tx", admin.ListWalletTxHandler)    // /admin/wallet-tx (deprecated, use /admin/wallets instead)
	adminGroup.Post("/tx/:id/approve", admin.ApproveTxHandler) // /admin/tx/:id/approve
	adminGroup.Get("/logs", admin.ListAuditHandler)            // /admin/logs

	// 系统设置管理
	settingsGroup := adminGroup.Group("/settings")
	settingsGroup.Get("/", adminSettings.ListSettingsHandler)           // /admin/settings
	settingsGroup.Get("/:key", adminSettings.GetSettingHandler)         // /admin/settings/:key
	settingsGroup.Post("/", adminSettings.UpsertSettingHandler)         // /admin/settings
	settingsGroup.Put("/bulk", adminSettings.BulkUpdateSettingsHandler) // /admin/settings/bulk

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
	adminNotif.Post("/", adminNotification.AdminCreateHandler)      // /admin/notifications
	adminNotif.Get("/", adminNotification.AdminListHandler)         // /admin/notifications
	adminNotif.Delete("/:id", adminNotification.AdminDeleteHandler) // /admin/notifications/:id

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
