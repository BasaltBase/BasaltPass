package routes

import (
	tenant2 "basaltpass-backend/internal/handler/tenant"
	tenantNotif "basaltpass-backend/internal/handler/tenant/notification"
	"basaltpass-backend/internal/middleware"
	appHandler "basaltpass-backend/internal/public/app"
	"basaltpass-backend/internal/public/app/app_rbac"
	"basaltpass-backend/internal/public/app/app_user"
	"basaltpass-backend/internal/public/oauth"
	"basaltpass-backend/internal/public/subscription"
	"github.com/gofiber/fiber/v2"
)

// RegisterTenantRoutes 注册租户相关路由
func RegisterTenantRoutes(v1 fiber.Router) {
	/**
	 * 租户级路由
	 * 这些路由需要租户上下文，但不需要全局管理员权限
	 * 所有租户管理员
	 */
	tenantGroup := v1.Group("/tenant", middleware.JWTMiddleware(), middleware.TenantMiddleware())

	// 租户信息管理
	tenantGroup.Get("/info", tenant2.TenantGetInfoHandler)

	// 租户用户管理路由
	tenantUserGroup := tenantGroup.Group("/users")
	tenantUserGroup.Get("/", tenant2.GetTenantUsersHandler) // 获取tenant的全部app的全部用户
	tenantUserGroup.Get("/app-linked", tenant2.GetTenantAppLinkedUsersHandler)
	tenantUserGroup.Get("/stats", tenant2.GetTenantUserStatsHandler)
	tenantUserGroup.Get("/:id", tenant2.GetTenantUserHandler)
	tenantUserGroup.Put("/:id", tenant2.UpdateTenantUserHandler)
	tenantUserGroup.Delete("/:id", tenant2.RemoveTenantUserHandler)
	tenantUserGroup.Post("/invite", tenant2.InviteTenantUserHandler) // /tenant/users/invite
	tenantUserGroup.Post("/:id/resend-invitation", tenant2.ResendInvitationHandler)

	// 租户角色管理路由
	tenantRoleGroupV2 := tenantGroup.Group("/roles")
	tenantRoleGroupV2.Get("/", tenant2.GetTenantRoles)
	tenantRoleGroupV2.Post("/", tenant2.CreateTenantRole)
	tenantRoleGroupV2.Put("/:id", tenant2.UpdateTenantRole)
	tenantRoleGroupV2.Delete("/:id", tenant2.DeleteTenantRole)
	tenantRoleGroupV2.Get("/users", tenant2.GetTenantUsersForRole)
	tenantRoleGroupV2.Post("/assign", tenant2.AssignUserRoles)
	tenantRoleGroupV2.Get("/users/:user_id", tenant2.GetUserRoles)

	// 租户通知管理
	tenantNotifGroup := tenantGroup.Group("/notifications")
	tenantNotifGroup.Post("/", tenantNotif.TenantCreateHandler)
	tenantNotifGroup.Get("/", tenantNotif.TenantListHandler)
	tenantNotifGroup.Get("/stats", tenantNotif.TenantGetNotificationStatsHandler)
	tenantNotifGroup.Get("/:id", tenantNotif.TenantGetNotificationHandler)
	tenantNotifGroup.Put("/:id", tenantNotif.TenantUpdateNotificationHandler)
	tenantNotifGroup.Delete("/:id", tenantNotif.TenantDeleteHandler)
	tenantNotifGroup.Get("/users", tenantNotif.TenantListHandler) // 简化：如需单独接口可再拆
	tenantNotifGroup.Get("/users/search", tenantNotif.TenantListHandler)

	// 租户OAuth客户端管理路由
	tenantOAuthGroup := tenantGroup.Group("/oauth/clients")
	tenantOAuthGroup.Get("/", oauth.TenantListOAuthClientsHandler)
	tenantOAuthGroup.Post("/", oauth.TenantCreateOAuthClientHandler)
	tenantOAuthGroup.Put("/:client_id", oauth.TenantUpdateOAuthClientHandler)
	tenantOAuthGroup.Delete("/:client_id", oauth.TenantDeleteOAuthClientHandler)
	tenantOAuthGroup.Post("/:client_id/regenerate-secret", oauth.TenantRegenerateClientSecretHandler)

	// 租户订阅管理（读写，所有租户成员可访问）
	tenantSubscriptionMgmtGroup := tenantGroup.Group("/subscription")

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

	// 租户应用管理路由
	tenantAppGroup := tenantGroup.Group("/apps")

	// 租户基础应用管理路由
	tenantAppGroup.Get("/", appHandler.TenantListAppsHandler)
	tenantAppGroup.Post("/", appHandler.TenantCreateAppHandler)
	tenantAppGroup.Get("/:id", appHandler.TenantGetAppHandler)
	tenantAppGroup.Put("/:id", appHandler.TenantUpdateAppHandler)
	tenantAppGroup.Delete("/:id", appHandler.TenantDeleteAppHandler)
	tenantAppGroup.Get("/:id/stats", appHandler.TenantGetAppStatsHandler)
	tenantAppGroup.Patch("/:id/status", appHandler.TenantToggleAppStatusHandler)

	// 应用权限管理路由
	tenantAppGroup.Get("/:app_id/permissions", app_rbac.GetAppPermissions)
	tenantAppGroup.Post("/:app_id/permissions", app_rbac.CreateAppPermission)
	tenantAppGroup.Put("/:app_id/permissions/:permission_id", app_rbac.UpdateAppPermission)
	tenantAppGroup.Delete("/:app_id/permissions/:permission_id", app_rbac.DeleteAppPermission)

	// 应用角色管理路由
	tenantAppGroup.Get("/:app_id/roles", app_rbac.GetAppRoles)
	tenantAppGroup.Post("/:app_id/roles", app_rbac.CreateAppRole)
	tenantAppGroup.Put("/:app_id/roles/:role_id", app_rbac.UpdateAppRole)
	tenantAppGroup.Delete("/:app_id/roles/:role_id", app_rbac.DeleteAppRole)

	// 应用用户管理路由（包含权限）
	tenantAppGroup.Get("/:app_id/users", app_rbac.GetAppUsers)
	tenantAppGroup.Get("/:app_id/users/by-status", app_user.GetAppUsersByStatusHandler)
	tenantAppGroup.Get("/:app_id/users/stats", app_user.GetAppUserStatsHandler)
	tenantAppGroup.Put("/:app_id/users/:user_id/status", app_user.UpdateAppUserStatusHandler)

	// 应用用户权限管理路由
	tenantAppGroup.Get("/:app_id/users/:user_id/permissions", app_rbac.GetUserPermissions)
	tenantAppGroup.Post("/:app_id/users/:user_id/permissions", app_rbac.GrantUserPermissions)
	tenantAppGroup.Delete("/:app_id/users/:user_id/permissions/:permission_id", app_rbac.RevokeUserPermission)
	tenantAppGroup.Post("/:app_id/users/:user_id/roles", app_rbac.AssignUserRoles)
	tenantAppGroup.Delete("/:app_id/users/:user_id/roles/:role_id", app_rbac.RevokeUserRole)

	// 租户用户订阅查看路由（需要租户上下文但不需要管理员权限）
	tenantUserSubscriptionGroup := v1.Group("/tenant", middleware.JWTMiddleware(), middleware.TenantMiddleware()).Group("/subscriptions")
	tenantUserSubscriptionGroup.Get("/", subscription.ListTenantUserSubscriptionsHandler)
	tenantUserSubscriptionGroup.Get("/:id", subscription.GetTenantUserSubscriptionHandler)
}
