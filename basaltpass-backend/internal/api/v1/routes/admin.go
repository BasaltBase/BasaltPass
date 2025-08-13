package routes

import (
	admin2 "basaltpass-backend/internal/handler/admin"
	adminInvitation "basaltpass-backend/internal/handler/admin/invitation"
	adminNotification "basaltpass-backend/internal/handler/admin/notification"
	adminSettings "basaltpass-backend/internal/handler/admin/settings"
	adminTeam "basaltpass-backend/internal/handler/admin/team"
	adminTenant "basaltpass-backend/internal/handler/admin/tenant"
	adminUser "basaltpass-backend/internal/handler/admin/user"
	adminWallet "basaltpass-backend/internal/handler/admin/wallet"
	appHandler "basaltpass-backend/internal/handler/public/app"
	"basaltpass-backend/internal/handler/public/app/app_user"
	"basaltpass-backend/internal/handler/public/oauth"
	"basaltpass-backend/internal/handler/public/rbac"
	"basaltpass-backend/internal/handler/public/subscription"
	"basaltpass-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// RegisterAdminRoutes 注册系统级管理员路由
func RegisterAdminRoutes(v1 fiber.Router) {
	// 原有的系统级管理员路由（保持向后兼容）
	adminGroup := v1.Group("/tenant", middleware.JWTMiddleware(), middleware.AdminMiddleware())
	// 新增 /admin 前缀别名，逐步迁移
	adminAliasGroup := v1.Group("/admin", middleware.JWTMiddleware(), middleware.AdminMiddleware())

	adminGroup.Get("/dashboard/stats", admin2.DashboardStatsHandler)        // /tenant/dashboard/stats
	adminGroup.Get("/dashboard/activities", admin2.RecentActivitiesHandler) // /tenant/dashboard/activities
	adminGroup.Get("/roles", rbac.ListRolesHandler)                         // /tenant/roles
	adminGroup.Post("/roles", rbac.CreateRoleHandler)                       // /tenant/roles
	adminGroup.Post("/user/:id/role", rbac.AssignRoleHandler)               // /tenant/user/:id/role

	// 权限管理（系统级）
	adminPermGroup := adminGroup.Group("/permissions")
	adminPermGroup.Get("/", rbac.ListPermissionsHandler)        // /tenant/permissions
	adminPermGroup.Post("/", rbac.CreatePermissionHandler)      // /tenant/permissions
	adminPermGroup.Put("/:id", rbac.UpdatePermissionHandler)    // /tenant/permissions/:id
	adminPermGroup.Delete("/:id", rbac.DeletePermissionHandler) // /tenant/permissions/:id

	// 角色-权限管理
	adminGroup.Get("/roles/:id/permissions", rbac.GetRolePermissionsHandler)                     // /tenant/roles/:id/permissions
	adminGroup.Post("/roles/:id/permissions", rbac.SetRolePermissionsHandler)                    // /tenant/roles/:id/permissions
	adminGroup.Delete("/roles/:id/permissions/:permission_id", rbac.RemoveRolePermissionHandler) // /tenant/roles/:id/permissions/:permission_id

	// 新的用户管理路由（替换原有的用户相关路由）
	adminUserGroup := adminGroup.Group("/users")
	adminUserGroup.Get("/", adminUser.ListUsersHandler)                             // /tenant/users
	adminUserGroup.Post("/", adminUser.CreateUserHandler)                           // /tenant/users
	adminUserGroup.Get("/stats", adminUser.GetUserStatsHandler)                     // /tenant/users/stats
	adminUserGroup.Get("/:id", adminUser.GetUserHandler)                            // /tenant/users/:id
	adminUserGroup.Put("/:id", adminUser.UpdateUserHandler)                         // /tenant/users/:id
	adminUserGroup.Delete("/:id", adminUser.DeleteUserHandler)                      // /tenant/users/:id
	adminUserGroup.Post("/:id/ban", adminUser.BanUserHandler)                       // /tenant/users/:id/ban
	adminUserGroup.Post("/:id/roles", adminUser.AssignGlobalRoleHandler)            // /tenant/users/:id/roles
	adminUserGroup.Delete("/:id/roles/:role_id", adminUser.RemoveGlobalRoleHandler) // /tenant/users/:id/roles/:role_id

	// 新的租户管理路由
	adminTenantGroup := adminGroup.Group("/tenants")
	adminTenantGroup.Get("/", adminTenant.GetTenantListHandler)       // /tenant/tenants
	adminTenantGroup.Post("/", adminTenant.CreateTenantHandler)       // /tenant/tenants
	adminTenantGroup.Get("/stats", adminTenant.GetTenantStatsHandler) // /tenant/tenants/stats
	adminTenantGroup.Get("/:id", adminTenant.GetTenantDetailHandler)  // /tenant/tenants/:id
	adminTenantGroup.Put("/:id", adminTenant.UpdateTenantHandler)     // /tenant/tenants/:id
	adminTenantGroup.Delete("/:id", adminTenant.DeleteTenantHandler)  // /tenant/tenants/:id

	// 租户用户管理
	adminTenantGroup.Get("/:id/users", adminTenant.GetTenantUsersHandler)              // /tenant/tenants/:id/users
	adminTenantGroup.Delete("/:id/users/:userId", adminTenant.RemoveTenantUserHandler) // /tenant/tenants/:id/users/:userId

	// 钱包管理路由
	walletHandler := adminWallet.NewAdminWalletHandler()
	adminWalletGroup := adminGroup.Group("/wallets")
	adminWalletGroup.Get("/", walletHandler.ListWallets)                           // /tenant/wallets
	adminWalletGroup.Post("/", walletHandler.CreateWallet)                         // /tenant/wallets
	adminWalletGroup.Get("/stats", walletHandler.GetWalletStats)                   // /tenant/wallets/stats
	adminWalletGroup.Get("/:id/transactions", walletHandler.GetWalletTransactions) // /tenant/wallets/:id/transactions
	adminWalletGroup.Post("/:id/adjust", walletHandler.AdjustBalance)              // /tenant/wallets/:id/adjust
	adminWalletGroup.Post("/:id/freeze", walletHandler.FreezeWallet)               // /tenant/wallets/:id/freeze
	adminWalletGroup.Post("/:id/unfreeze", walletHandler.UnfreezeWallet)           // /tenant/wallets/:id/unfreeze
	adminWalletGroup.Delete("/:id", walletHandler.DeleteWallet)                    // /tenant/wallets/:id

	// 用户钱包管理
	adminGroup.Get("/users/:id/wallets", walletHandler.GetUserWallets) // /tenant/users/:id/wallets

	// 团队钱包管理
	adminGroup.Get("/teams/:id/wallets", walletHandler.GetTeamWallets) // /tenant/teams/:id/wallets
	// 团队管理
	adminTeamGroup := adminGroup.Group("/teams")
	adminTeamGroup.Get("/", adminTeam.ListTeamsHandler)
	adminTeamGroup.Post("/", adminTeam.CreateTeamHandler)
	adminTeamGroup.Get("/:id", adminTeam.GetTeamHandler)
	adminTeamGroup.Put("/:id", adminTeam.UpdateTeamHandler)
	adminTeamGroup.Delete("/:id", adminTeam.DeleteTeamHandler)
	adminTeamGroup.Get("/:id/members", adminTeam.ListMembersHandler)
	adminTeamGroup.Post("/:id/members", adminTeam.AddMemberHandler)
	adminTeamGroup.Delete("/:id/members/:user_id", adminTeam.RemoveMemberHandler)
	adminTeamGroup.Put("/:id/members/:user_id/role", adminTeam.UpdateMemberRoleHandler)
	adminTeamGroup.Post("/:id/transfer/:new_owner_id", adminTeam.TransferOwnershipHandler)
	adminTeamGroup.Post("/:id/active", adminTeam.ToggleActiveHandler)

	// alias teams
	aliasTeams := adminAliasGroup.Group("/teams")
	aliasTeams.Get("/", adminTeam.ListTeamsHandler)
	aliasTeams.Post("/", adminTeam.CreateTeamHandler)
	aliasTeams.Get("/:id", adminTeam.GetTeamHandler)
	aliasTeams.Put("/:id", adminTeam.UpdateTeamHandler)
	aliasTeams.Delete("/:id", adminTeam.DeleteTeamHandler)
	aliasTeams.Get("/:id/members", adminTeam.ListMembersHandler)
	aliasTeams.Post("/:id/members", adminTeam.AddMemberHandler)
	aliasTeams.Delete("/:id/members/:user_id", adminTeam.RemoveMemberHandler)
	aliasTeams.Put("/:id/members/:user_id/role", adminTeam.UpdateMemberRoleHandler)
	aliasTeams.Post("/:id/transfer/:new_owner_id", adminTeam.TransferOwnershipHandler)
	aliasTeams.Post("/:id/active", adminTeam.ToggleActiveHandler)

	// 货币管理
	adminGroup.Get("/currencies", walletHandler.GetCurrencies) // /tenant/currencies

	// 邀请管理
	adminInvitationGroup := adminGroup.Group("/invitations")
	adminInvitationGroup.Get("/", adminInvitation.ListInvitationsHandler)
	adminInvitationGroup.Post("/", adminInvitation.CreateInvitationHandler)
	adminInvitationGroup.Put("/:id/status", adminInvitation.UpdateInvitationStatusHandler)
	adminInvitationGroup.Delete("/:id", adminInvitation.DeleteInvitationHandler)

	// alias invitations
	aliasInv := adminAliasGroup.Group("/invitations")
	aliasInv.Get("/", adminInvitation.ListInvitationsHandler)
	aliasInv.Post("/", adminInvitation.CreateInvitationHandler)
	aliasInv.Put("/:id/status", adminInvitation.UpdateInvitationStatusHandler)
	aliasInv.Delete("/:id", adminInvitation.DeleteInvitationHandler)

	// 保留原有的钱包交易审批路由（向后兼容）
	adminGroup.Get("/wallet-tx", admin2.ListWalletTxHandler)          // /tenant/wallet-tx (deprecated, use /tenant/wallets instead)
	adminGroup.Post("/tx/:id/approve", admin2.ApproveWalletTxHandler) // /tenant/tx/:id/approve (deprecated)
	adminGroup.Get("/logs", admin2.ListAuditHandler)                  // /tenant/logs

	// 系统设置管理
	settingsGroup := adminGroup.Group("/settings")
	settingsGroup.Get("/", adminSettings.ListSettingsHandler)           // /tenant/settings
	settingsGroup.Get("/:key", adminSettings.GetSettingHandler)         // /tenant/settings/:key
	settingsGroup.Post("/", adminSettings.UpsertSettingHandler)         // /tenant/settings
	settingsGroup.Put("/bulk", adminSettings.BulkUpdateSettingsHandler) // /tenant/settings/bulk

	// OAuth2客户端管理路由（高级管理级）
	oauthClientGroup := adminGroup.Group("/oauth/clients")                                // /tenant/oauth/clients
	oauthClientGroup.Post("/", oauth.CreateClientHandler)                                 // /tenant/oauth/clients
	oauthClientGroup.Get("/", oauth.ListClientsHandler)                                   // /tenant/oauth/clients
	oauthClientGroup.Get("/:client_id", oauth.GetClientHandler)                           // /tenant/oauth/clients/:client_id
	oauthClientGroup.Put("/:client_id", oauth.UpdateClientHandler)                        // /tenant/oauth/clients/:client_id
	oauthClientGroup.Delete("/:client_id", oauth.DeleteClientHandler)                     // /tenant/oauth/clients/:client_id
	oauthClientGroup.Post("/:client_id/regenerate-secret", oauth.RegenerateSecretHandler) // /tenant/oauth/clients/:client_id/regenerate-secret
	oauthClientGroup.Get("/:client_id/stats", oauth.GetClientStatsHandler)                // /tenant/oauth/clients/:client_id/stats
	oauthClientGroup.Get("/:client_id/tokens", oauth.GetTokensHandler)                    // /tenant/oauth/clients/:client_id/tokens
	oauthClientGroup.Post("/:client_id/revoke-tokens", oauth.RevokeClientTokensHandler)   // /tenant/oauth/clients/:client_id/revoke-tokens

	// 系统级应用管理
	adminAppGroup := adminGroup.Group("/apps")
	adminAppGroup.Post("/", appHandler.AdminCreateAppHandler)      // /tenant/apps
	adminAppGroup.Get("/", appHandler.AdminListAppsHandler)        // /tenant/apps
	adminAppGroup.Get("/:id", appHandler.AdminGetAppHandler)       // /tenant/apps/:id
	adminAppGroup.Put("/:id", appHandler.AdminUpdateAppHandler)    // /tenant/apps/:id
	adminAppGroup.Delete("/:id", appHandler.AdminDeleteAppHandler) // /tenant/apps/:id

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
	adminNotif.Post("/", adminNotification.AdminCreateHandler)      // /tenant/notifications
	adminNotif.Get("/", adminNotification.AdminListHandler)         // /tenant/notifications
	adminNotif.Delete("/:id", adminNotification.AdminDeleteHandler) // /tenant/notifications/:id

	// ========== 管理员订阅系统路由 ==========
	// 产品管理
	adminProductsGroup := adminGroup.Group("/products")
	adminProductsGroup.Get("/", subscription.AdminListProductsHandler)   // /tenant/products
	adminProductsGroup.Get("/:id", subscription.AdminGetProductHandler)  // /tenant/products/:id
	adminProductsGroup.Post("/", subscription.CreateProductHandler)      // /tenant/products
	adminProductsGroup.Put("/:id", subscription.UpdateProductHandler)    // /tenant/products/:id
	adminProductsGroup.Delete("/:id", subscription.DeleteProductHandler) // /tenant/products/:id

	// 套餐管理
	adminPlansGroup := adminGroup.Group("/plans")
	adminPlansGroup.Get("/", subscription.AdminListPlansHandler)             // /tenant/plans
	adminPlansGroup.Get("/:id", subscription.AdminGetPlanHandler)            // /tenant/plans/:id
	adminPlansGroup.Post("/", subscription.CreatePlanHandler)                // /tenant/plans
	adminPlansGroup.Put("/:id", subscription.UpdatePlanHandler)              // /tenant/plans/:id
	adminPlansGroup.Delete("/:id", subscription.DeletePlanHandler)           // /tenant/plans/:id
	adminPlansGroup.Post("/features", subscription.CreatePlanFeatureHandler) // /tenant/plans/features

	// 定价管理
	adminPricesGroup := adminGroup.Group("/prices")
	adminPricesGroup.Get("/", subscription.AdminListPricesHandler)   // /tenant/prices
	adminPricesGroup.Get("/:id", subscription.AdminGetPriceHandler)  // /tenant/prices/:id
	adminPricesGroup.Post("/", subscription.CreatePriceHandler)      // /tenant/prices
	adminPricesGroup.Put("/:id", subscription.UpdatePriceHandler)    // /tenant/prices/:id
	adminPricesGroup.Delete("/:id", subscription.DeletePriceHandler) // /tenant/prices/:id

	// 优惠券管理
	adminCouponsGroup := adminGroup.Group("/coupons")
	adminCouponsGroup.Get("/", subscription.AdminListCouponsHandler)     // /tenant/coupons
	adminCouponsGroup.Get("/:code", subscription.AdminGetCouponHandler)  // /tenant/coupons/:code
	adminCouponsGroup.Post("/", subscription.CreateCouponHandler)        // /tenant/coupons
	adminCouponsGroup.Put("/:code", subscription.UpdateCouponHandler)    // /tenant/coupons/:code
	adminCouponsGroup.Delete("/:code", subscription.DeleteCouponHandler) // /tenant/coupons/:code

	// 订阅管理
	adminSubscriptionsGroup := adminGroup.Group("/subscriptions")
	adminSubscriptionsGroup.Get("/", subscription.AdminListSubscriptionsHandler)            // /tenant/subscriptions
	adminSubscriptionsGroup.Get("/:id", subscription.AdminGetSubscriptionHandler)           // /tenant/subscriptions/:id
	adminSubscriptionsGroup.Put("/:id/cancel", subscription.AdminCancelSubscriptionHandler) // /tenant/subscriptions/:id/cancel
}
