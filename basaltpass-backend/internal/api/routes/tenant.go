package routes

import (
	appHandler "basaltpass-backend/internal/app"
	"basaltpass-backend/internal/app_rbac"
	"basaltpass-backend/internal/app_user"
	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/notification"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/subscription"
	"basaltpass-backend/internal/tenant"

	"github.com/gofiber/fiber/v2"
)

// RegisterTenantRoutes 注册租户相关路由
func RegisterTenantRoutes(v1 fiber.Router) {
	/**
	 * 租户级路由
	 * 这些路由需要租户上下文，但不需要管理员权限
	 * 所有租户成员可访问
	 */
	tenantGroup := v1.Group("/tenant", middleware.JWTMiddleware(), middleware.TenantMiddleware())

	// 租户信息管理
	tenantGroup.Get("/info", tenant.TenantGetInfoHandler)

	// 租户用户管理路由
	tenantUserGroup := tenantGroup.Group("/users")
	tenantUserGroup.Get("/", tenant.GetTenantUsersHandler)
	tenantUserGroup.Get("/stats", tenant.GetTenantUserStatsHandler)
	tenantUserGroup.Get("/:id", tenant.GetTenantUserHandler)
	tenantUserGroup.Put("/:id", tenant.UpdateTenantUserHandler)
	tenantUserGroup.Delete("/:id", tenant.RemoveTenantUserHandler)
	tenantUserGroup.Post("/invite", tenant.InviteTenantUserHandler) // /tenant/users/invite
	tenantUserGroup.Post("/:id/resend-invitation", tenant.ResendInvitationHandler)

	// 租户角色管理路由
	tenantRoleGroupV2 := tenantGroup.Group("/roles")
	tenantRoleGroupV2.Get("/", tenant.GetTenantRoles)
	tenantRoleGroupV2.Post("/", tenant.CreateTenantRole)
	tenantRoleGroupV2.Put("/:id", tenant.UpdateTenantRole)
	tenantRoleGroupV2.Delete("/:id", tenant.DeleteTenantRole)
	tenantRoleGroupV2.Get("/users", tenant.GetTenantUsersForRole)
	tenantRoleGroupV2.Post("/assign", tenant.AssignUserRoles)
	tenantRoleGroupV2.Get("/users/:user_id", tenant.GetUserRoles)

	// 租户通知管理
	tenantNotifGroup := tenantGroup.Group("/notifications")
	tenantNotifGroup.Post("/", notification.TenantCreateHandler)
	tenantNotifGroup.Get("/", notification.TenantListHandler)
	tenantNotifGroup.Get("/stats", notification.TenantGetNotificationStatsHandler)
	tenantNotifGroup.Get("/:id", notification.TenantGetNotificationHandler)
	tenantNotifGroup.Put("/:id", notification.TenantUpdateNotificationHandler)
	tenantNotifGroup.Delete("/:id", notification.TenantDeleteHandler)
	tenantNotifGroup.Get("/users", notification.TenantGetUsersHandler)
	tenantNotifGroup.Get("/users/search", notification.TenantSearchUsersHandler)

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
