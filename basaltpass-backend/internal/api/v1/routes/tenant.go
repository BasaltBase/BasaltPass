package routes

import (
	adminWallet "basaltpass-backend/internal/handler/admin/wallet"
	"basaltpass-backend/internal/handler/manualapi"
	app_rbac2 "basaltpass-backend/internal/handler/public/app/app_rbac"
	"basaltpass-backend/internal/handler/public/app/app_user"
	"basaltpass-backend/internal/handler/public/oauth"
	"basaltpass-backend/internal/handler/public/subscription"
	tenant2 "basaltpass-backend/internal/handler/tenant"
	"basaltpass-backend/internal/handler/tenant/app"
	tenantNotif "basaltpass-backend/internal/handler/tenant/notification"
	"basaltpass-backend/internal/middleware"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// InitTenantRouteDependencies 初始化租户路由依赖
func InitTenantRouteDependencies(db *gorm.DB) {
	subscription.InitTenantHandler(db)
	subscription.InitTenantCatalogHandler(db)
}

// RegisterTenantRoutes 注册租户相关路由
func RegisterTenantRoutes(v1 fiber.Router) {
	/**
	 * 租户级路由
	 * 这些路由需要租户上下文，但不需要全局管理员权限
	 * 所有租户管理员
	 */
	tenantGroup := v1.Group("/tenant", profileTenantConsole()...)
	tenantAdminGroup := tenantGroup.Group("", middleware.TenantUserMiddleware())
	walletHandler := adminWallet.NewAdminWalletHandler()

	// 租户信息管理
	tenantGroup.Get("/info", tenant2.TenantGetInfoHandler)
	tenantGroup.Get("/stripe-config", tenant2.TenantGetStripeConfigHandler)
	tenantGroup.Get("/auth-settings", tenant2.TenantGetAuthSettingsHandler)
	tenantAdminGroup.Put("/stripe-config", tenant2.TenantUpdateStripeConfigHandler)
	tenantAdminGroup.Put("/auth-settings", tenant2.TenantUpdateAuthSettingsHandler)
	tenantGroup.Get("/currencies", walletHandler.GetCurrencies)
	tenantGroup.Post("/liveness-check", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"ok":         true,
			"scope":      "tenant",
			"message":    "tenant liveness check ok",
			"checked_at": time.Now().UTC().Format(time.RFC3339),
		})
	})

	// 租户用户管理路由
	tenantUserGroup := tenantAdminGroup.Group("/users")
	tenantUserGroup.Get("/", tenant2.GetTenantUsersHandler) // 获取tenant的全部app的全部用户
	tenantUserGroup.Get("/app-linked", tenant2.GetTenantAppLinkedUsersHandler)
	tenantUserGroup.Get("/stats", tenant2.GetTenantUserStatsHandler)
	tenantUserGroup.Get("/global-candidates", tenant2.GetGlobalUserCandidatesHandler)
	tenantUserGroup.Post("/global-candidates/:id/authorize", tenant2.AuthorizeGlobalUserToTenantHandler)
	tenantUserGroup.Get("/by-uuid/:user_uuid", tenant2.GetTenantUserByUUIDHandler)
	tenantUserGroup.Get("/:id", tenant2.GetTenantUserHandler)
	tenantUserGroup.Put("/:id", tenant2.UpdateTenantUserHandler)
	tenantUserGroup.Delete("/:id", tenant2.RemoveTenantUserHandler)
	tenantUserGroup.Post("/invite", tenant2.InviteTenantUserHandler) // /tenant/users/invite
	tenantUserGroup.Post("/:id/resend-invitation", tenant2.ResendInvitationHandler)

	// 租户权限管理路由
	tenantPermissionGroup := tenantAdminGroup.Group("/permissions")
	tenantPermissionGroup.Get("/", tenant2.GetTenantPermissions)
	tenantPermissionGroup.Post("/", tenant2.CreateTenantPermission)
	tenantPermissionGroup.Post("/import", tenant2.ImportTenantPermissions)
	tenantPermissionGroup.Post("/check", tenant2.CheckTenantUserPermissions)
	tenantPermissionGroup.Put("/:id", tenant2.UpdateTenantPermission)
	tenantPermissionGroup.Delete("/:id", tenant2.DeleteTenantPermission)
	tenantPermissionGroup.Get("/categories", tenant2.GetTenantPermissionCategories)

	// 租户角色管理路由
	tenantRoleGroupV2 := tenantAdminGroup.Group("/roles")
	tenantRoleGroupV2.Get("/", tenant2.GetTenantRoles)
	tenantRoleGroupV2.Post("/", tenant2.CreateTenantRole)
	tenantRoleGroupV2.Post("/import", tenant2.ImportTenantRoles)
	tenantRoleGroupV2.Post("/check", tenant2.CheckTenantUserRoles)
	tenantRoleGroupV2.Put("/:id", tenant2.UpdateTenantRole)
	tenantRoleGroupV2.Delete("/:id", tenant2.DeleteTenantRole)
	tenantRoleGroupV2.Get("/users", tenant2.GetTenantUsersForRole)
	tenantRoleGroupV2.Post("/assign", tenant2.AssignUserRoles)
	tenantRoleGroupV2.Get("/users/:user_id", tenant2.GetUserRoles)
	tenantRoleGroupV2.Get("/:id/permissions", tenant2.GetRolePermissions)
	tenantRoleGroupV2.Post("/:id/permissions", tenant2.AddPermissionsToRole)
	tenantRoleGroupV2.Delete("/:id/permissions/:permission_id", tenant2.RemovePermissionFromRole)

	// 租户团队管理路由
	tenantTeamGroup := tenantAdminGroup.Group("/teams")
	tenantTeamGroup.Get("/", tenant2.ListTenantTeamsHandler)
	tenantTeamGroup.Post("/", tenant2.CreateTenantTeamHandler)
	tenantTeamGroup.Get("/:id", tenant2.GetTenantTeamHandler)
	tenantTeamGroup.Put("/:id", tenant2.UpdateTenantTeamHandler)
	tenantTeamGroup.Delete("/:id", tenant2.DeleteTenantTeamHandler)
	tenantTeamGroup.Get("/:id/members", tenant2.ListTenantTeamMembersHandler)
	tenantTeamGroup.Post("/:id/members", tenant2.AddTenantTeamMemberHandler)
	tenantTeamGroup.Delete("/:id/members/:user_id", tenant2.RemoveTenantTeamMemberHandler)
	tenantTeamGroup.Put("/:id/members/:user_id/role", tenant2.UpdateTenantTeamMemberRoleHandler)
	tenantTeamGroup.Post("/:id/transfer/:new_owner_id", tenant2.TransferTenantTeamOwnershipHandler)
	tenantTeamGroup.Post("/:id/active", tenant2.ToggleTenantTeamActiveHandler)

	// 租户通知管理
	tenantNotifGroup := tenantAdminGroup.Group("/notifications")
	tenantNotifGroup.Post("/", tenantNotif.TenantCreateHandler)
	tenantNotifGroup.Get("/", tenantNotif.TenantListHandler)
	tenantNotifGroup.Get("/stats", tenantNotif.TenantGetNotificationStatsHandler)
	tenantNotifGroup.Get("/users", tenantNotif.TenantListUsersHandler)
	tenantNotifGroup.Get("/users/search", tenantNotif.TenantSearchUsersHandler)
	tenantNotifGroup.Get("/:id", tenantNotif.TenantGetNotificationHandler)
	tenantNotifGroup.Put("/:id", tenantNotif.TenantUpdateNotificationHandler)
	tenantNotifGroup.Delete("/:id", tenantNotif.TenantDeleteHandler)

	// 租户钱包管理
	tenantWalletGroup := tenantAdminGroup.Group("/wallets")
	tenantWalletGroup.Get("/", walletHandler.ListWallets)
	tenantWalletGroup.Post("/", walletHandler.CreateWallet)
	tenantWalletGroup.Get("/stats", walletHandler.GetWalletStats)
	tenantWalletGroup.Get("/:id", walletHandler.GetWallet)
	tenantWalletGroup.Get("/:id/transactions", walletHandler.GetWalletTransactions)
	tenantWalletGroup.Post("/:id/adjust", walletHandler.AdjustBalance)
	tenantWalletGroup.Post("/:id/freeze", walletHandler.FreezeWallet)
	tenantWalletGroup.Post("/:id/unfreeze", walletHandler.UnfreezeWallet)
	tenantWalletGroup.Delete("/:id", walletHandler.DeleteWallet)

	tenantGiftCardGroup := tenantAdminGroup.Group("/gift-cards")
	tenantGiftCardGroup.Get("/", tenant2.TenantListGiftCardsHandler)
	tenantGiftCardGroup.Post("/batches", tenant2.TenantCreateGiftCardBatchHandler)
	tenantGiftCardGroup.Get("/:code", tenant2.TenantGetGiftCardByCodeHandler)
	tenantGiftCardGroup.Post("/:id/invalidate", tenant2.TenantInvalidateGiftCardHandler)

	tenantAdminGroup.Get("/users/:id/wallets", walletHandler.GetUserWallets)
	tenantAdminGroup.Post("/users/:id/wallets/adjust", walletHandler.AdjustUserWallet)
	tenantAdminGroup.Get("/teams/:id/wallets", walletHandler.GetTeamWallets)
	tenantAdminGroup.Post("/teams/:id/wallets/adjust", walletHandler.AdjustTeamWallet)

	// 租户OAuth客户端管理路由
	tenantOAuthGroup := tenantAdminGroup.Group("/oauth/clients")
	tenantOAuthGroup.Get("/", oauth.TenantListOAuthClientsHandler)
	tenantOAuthGroup.Post("/", oauth.TenantCreateOAuthClientHandler)
	tenantOAuthGroup.Put("/:client_id", oauth.TenantUpdateOAuthClientHandler)
	tenantOAuthGroup.Delete("/:client_id", oauth.TenantDeleteOAuthClientHandler)
	tenantOAuthGroup.Post("/:client_id/regenerate-secret", oauth.TenantRegenerateClientSecretHandler)

	// 租户OAuth scope 选项（用于控制台创建/编辑客户端）
	tenantGroup.Get("/oauth/scopes", oauth.TenantListOAuthScopesHandler)

	// 租户控制台生成手动 API Key
	tenantManualAPIGroup := tenantAdminGroup.Group("/manual-api")
	tenantManualAPIGroup.Get("/keys", manualapi.TenantListManualAPIKeysHandler)
	tenantManualAPIGroup.Post("/keys", manualapi.TenantCreateManualAPIKeyHandler)
	tenantManualAPIGroup.Delete("/keys/:id", manualapi.TenantDeleteManualAPIKeyHandler)

	// 跨应用信任关系管理（Token Exchange, RFC 8693）
	crossAppTrustGroup := tenantAdminGroup.Group("/cross-app-trusts")
	crossAppTrustGroup.Get("/", tenant2.ListCrossAppTrustsHandler)
	crossAppTrustGroup.Post("/", tenant2.CreateCrossAppTrustHandler)
	crossAppTrustGroup.Patch("/:id", tenant2.UpdateCrossAppTrustHandler)
	crossAppTrustGroup.Delete("/:id", tenant2.DeleteCrossAppTrustHandler)
	crossAppTrustGroup.Get("/logs", tenant2.ListTokenExchangeLogsHandler)

	// 租户订阅管理（读写，所有租户成员可访问）
	tenantSubscriptionMgmtGroup := tenantAdminGroup.Group("/subscription")

	// 租户产品管理
	tenantProductMgmtGroup := tenantSubscriptionMgmtGroup.Group("/products")
	tenantProductMgmtGroup.Get("/", subscription.ListTenantProductsHandler)
	tenantProductMgmtGroup.Get("/:id", subscription.GetTenantProductHandler)
	tenantProductMgmtGroup.Post("/", subscription.CreateTenantProductHandler)
	tenantProductMgmtGroup.Put("/:id", subscription.UpdateTenantProductHandler)
	tenantProductMgmtGroup.Delete("/:id", subscription.DeleteTenantProductHandler)

	// 租户套餐管理
	tenantPlanMgmtGroup := tenantSubscriptionMgmtGroup.Group("/plans")
	tenantPlanMgmtGroup.Get("/", subscription.ListTenantPlansHandler)
	tenantPlanMgmtGroup.Get("/:id", subscription.GetTenantPlanHandler)
	tenantPlanMgmtGroup.Post("/", subscription.CreateTenantPlanHandler)
	tenantPlanMgmtGroup.Put("/:id", subscription.UpdateTenantPlanHandler)
	tenantPlanMgmtGroup.Delete("/:id", subscription.DeleteTenantPlanHandler)

	// 租户定价管理
	tenantPriceMgmtGroup := tenantSubscriptionMgmtGroup.Group("/prices")
	tenantPriceMgmtGroup.Get("/", subscription.ListTenantPricesHandler)
	tenantPriceMgmtGroup.Get("/:id", subscription.GetTenantPriceHandler)
	tenantPriceMgmtGroup.Post("/", subscription.CreateTenantPriceHandler)
	tenantPriceMgmtGroup.Put("/:id", subscription.UpdateTenantPriceHandler)
	tenantPriceMgmtGroup.Delete("/:id", subscription.DeleteTenantPriceHandler)

	// 租户订阅管理
	tenantSubscriptionReadWriteGroup := tenantSubscriptionMgmtGroup.Group("/subscriptions")
	tenantSubscriptionReadWriteGroup.Get("/", subscription.ListTenantSubscriptionsHandler)
	tenantSubscriptionReadWriteGroup.Get("/:id", subscription.GetTenantSubscriptionHandler)
	tenantSubscriptionReadWriteGroup.Post("/", subscription.CreateTenantSubscriptionHandler)
	tenantSubscriptionReadWriteGroup.Post("/:id/cancel", subscription.CancelTenantSubscriptionHandler)

	// 租户优惠券管理
	tenantCouponMgmtGroup := tenantSubscriptionMgmtGroup.Group("/coupons")
	tenantCouponMgmtGroup.Get("/", subscription.ListTenantCouponsHandler)
	tenantCouponMgmtGroup.Get("/:code", subscription.GetTenantCouponHandler)
	tenantCouponMgmtGroup.Get("/:code/validate", subscription.ValidateTenantCouponHandler)
	tenantCouponMgmtGroup.Post("/", subscription.CreateTenantCouponHandler)
	tenantCouponMgmtGroup.Put("/:code", subscription.UpdateTenantCouponHandler)
	tenantCouponMgmtGroup.Delete("/:code", subscription.DeleteTenantCouponHandler)

	// 租户账单管理
	tenantInvoiceMgmtGroup := tenantSubscriptionMgmtGroup.Group("/invoices")
	tenantInvoiceMgmtGroup.Get("/", subscription.ListTenantInvoicesHandler)
	tenantInvoiceMgmtGroup.Post("/", subscription.CreateTenantInvoiceHandler)

	// 租户统计查看
	tenantSubscriptionMgmtGroup.Get("/stats", subscription.GetTenantSubscriptionStatsHandler)

	// 产品分类管理
	tenantSubscriptionMgmtGroup.Get("/categories", subscription.ListTenantCategoriesHandler)
	tenantSubscriptionMgmtGroup.Post("/categories", subscription.CreateTenantCategoryHandler)
	tenantSubscriptionMgmtGroup.Put("/categories/:id", subscription.UpdateTenantCategoryHandler)
	tenantSubscriptionMgmtGroup.Delete("/categories/:id", subscription.DeleteTenantCategoryHandler)

	// 产品标签管理
	tenantSubscriptionMgmtGroup.Get("/tags", subscription.ListTenantTagsHandler)
	tenantSubscriptionMgmtGroup.Post("/tags", subscription.CreateTenantTagHandler)
	tenantSubscriptionMgmtGroup.Put("/tags/:id", subscription.UpdateTenantTagHandler)
	tenantSubscriptionMgmtGroup.Delete("/tags/:id", subscription.DeleteTenantTagHandler)

	// 定价模板管理
	tenantSubscriptionMgmtGroup.Get("/price-templates", subscription.ListTenantPriceTemplatesHandler)
	tenantSubscriptionMgmtGroup.Post("/price-templates", subscription.CreateTenantPriceTemplateHandler)
	tenantSubscriptionMgmtGroup.Put("/price-templates/:id", subscription.UpdateTenantPriceTemplateHandler)
	tenantSubscriptionMgmtGroup.Delete("/price-templates/:id", subscription.DeleteTenantPriceTemplateHandler)

	// 租户应用管理路由
	tenantAppGroup := tenantAdminGroup.Group("/apps")

	// 租户基础应用管理路由
	tenantAppGroup.Get("/", app.TenantListAppsHandler)
	tenantAppGroup.Post("/", app.TenantCreateAppHandler)
	tenantAppGroup.Get("/:id", app.TenantGetAppHandler)
	tenantAppGroup.Put("/:id", app.TenantUpdateAppHandler)
	tenantAppGroup.Delete("/:id", app.TenantDeleteAppHandler)
	tenantAppGroup.Get("/:id/stats", app.TenantGetAppStatsHandler)
	tenantAppGroup.Patch("/:id/status", app.TenantToggleAppStatusHandler)

	// 应用权限管理路由
	tenantAppGroup.Get("/:app_id/permissions", app_rbac2.GetAppPermissions)
	tenantAppGroup.Post("/:app_id/permissions", app_rbac2.CreateAppPermission)
	tenantAppGroup.Post("/:app_id/permissions/import", app_rbac2.ImportAppPermissions)
	tenantAppGroup.Put("/:app_id/permissions/:permission_id", app_rbac2.UpdateAppPermission)
	tenantAppGroup.Delete("/:app_id/permissions/:permission_id", app_rbac2.DeleteAppPermission)

	// 应用角色管理路由
	tenantAppGroup.Get("/:app_id/roles", app_rbac2.GetAppRoles)
	tenantAppGroup.Post("/:app_id/roles", app_rbac2.CreateAppRole)
	tenantAppGroup.Post("/:app_id/roles/import", app_rbac2.ImportAppRoles)
	tenantAppGroup.Put("/:app_id/roles/:role_id", app_rbac2.UpdateAppRole)
	tenantAppGroup.Delete("/:app_id/roles/:role_id", app_rbac2.DeleteAppRole)

	// 应用用户管理路由（包含权限）
	tenantAppGroup.Get("/:app_id/users", app_rbac2.GetAppUsers)
	tenantAppGroup.Get("/:app_id/users/by-status", app_user.GetAppUsersByStatusHandler)
	tenantAppGroup.Get("/:app_id/users/stats", app_user.GetAppUserStatsHandler)
	tenantAppGroup.Put("/:app_id/users/:user_id/status", app_user.UpdateAppUserStatusHandler)

	// 应用用户权限管理路由
	tenantAppGroup.Get("/:app_id/users/:user_id/permissions", app_rbac2.GetUserPermissions)
	tenantAppGroup.Get("/:app_id/users/:user_id/roles", app_rbac2.GetUserRoles)
	tenantAppGroup.Post("/:app_id/users/:user_id/check-access", app_rbac2.CheckUserAccess)
	tenantAppGroup.Post("/:app_id/users/:user_id/permissions", app_rbac2.GrantUserPermissions)
	tenantAppGroup.Delete("/:app_id/users/:user_id/permissions/:permission_id", app_rbac2.RevokeUserPermission)
	tenantAppGroup.Post("/:app_id/users/:user_id/roles", app_rbac2.AssignUserRoles)
	tenantAppGroup.Delete("/:app_id/users/:user_id/roles/:role_id", app_rbac2.RevokeUserRole)

	// 租户用户订阅查看路由（需要租户上下文但不需要管理员权限）
	tenantUserSubscriptionGroup := v1.Group("/tenant", profileTenantContext()...).Group("/subscriptions")
	tenantUserSubscriptionGroup.Get("/", subscription.ListTenantUserSubscriptionsHandler)
	tenantUserSubscriptionGroup.Get("/:id", subscription.GetTenantUserSubscriptionHandler)
}
