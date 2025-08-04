package routes

import (
	"basaltpass-backend/internal/admin"
	appHandler "basaltpass-backend/internal/app"
	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/notification"
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
	platformTenantGroup.Post("/", tenant.CreateTenantHandler)
	platformTenantGroup.Get("/", tenant.ListTenantsHandler)
	platformTenantGroup.Get("/:id", tenant.GetTenantHandler)
	platformTenantGroup.Put("/:id", tenant.UpdateTenantHandler)
	platformTenantGroup.Delete("/:id", tenant.DeleteTenantHandler)

	// 原有的系统级管理员路由（保持向后兼容）
	adminGroup := v1.Group("/admin", middleware.JWTMiddleware(), middleware.AdminMiddleware())
	adminGroup.Get("/dashboard/stats", admin.DashboardStatsHandler)
	adminGroup.Get("/dashboard/activities", admin.RecentActivitiesHandler)
	adminGroup.Get("/roles", rbac.ListRolesHandler)
	adminGroup.Post("/roles", rbac.CreateRoleHandler)
	adminGroup.Post("/user/:id/role", rbac.AssignRoleHandler)
	adminGroup.Get("/users", admin.ListUsersHandler)
	adminGroup.Post("/user/:id/ban", admin.BanUserHandler)
	adminGroup.Get("/wallets", admin.ListWalletTxHandler)
	adminGroup.Post("/tx/:id/approve", admin.ApproveTxHandler)
	adminGroup.Get("/logs", admin.ListAuditHandler)

	// 系统级应用管理（不需要租户上下文）
	adminAppGroup := adminGroup.Group("/apps")
	adminAppGroup.Post("/", appHandler.AdminCreateAppHandler)
	adminAppGroup.Get("/", appHandler.AdminListAppsHandler)
	adminAppGroup.Get("/:id", appHandler.AdminGetAppHandler)
	adminAppGroup.Put("/:id", appHandler.AdminUpdateAppHandler)
	adminAppGroup.Delete("/:id", appHandler.AdminDeleteAppHandler)

	// 管理员通知路由
	adminNotif := adminGroup.Group("/notifications")
	adminNotif.Post("/", notification.AdminCreateHandler)
	adminNotif.Get("/", notification.AdminListHandler)
	adminNotif.Delete("/:id", notification.AdminDeleteHandler)

	// ========== 管理员订阅系统路由 ==========
	// 产品管理
	adminProductsGroup := adminGroup.Group("/products")
	adminProductsGroup.Get("/", subscription.AdminListProductsHandler)
	adminProductsGroup.Get("/:id", subscription.AdminGetProductHandler)
	adminProductsGroup.Post("/", subscription.CreateProductHandler)
	adminProductsGroup.Put("/:id", subscription.UpdateProductHandler)
	adminProductsGroup.Delete("/:id", subscription.DeleteProductHandler)

	// 套餐管理
	adminPlansGroup := adminGroup.Group("/plans")
	adminPlansGroup.Get("/", subscription.AdminListPlansHandler)
	adminPlansGroup.Get("/:id", subscription.AdminGetPlanHandler)
	adminPlansGroup.Post("/", subscription.CreatePlanHandler)
	adminPlansGroup.Put("/:id", subscription.UpdatePlanHandler)
	adminPlansGroup.Delete("/:id", subscription.DeletePlanHandler)
	adminPlansGroup.Post("/features", subscription.CreatePlanFeatureHandler)

	// 定价管理
	adminPricesGroup := adminGroup.Group("/prices")
	adminPricesGroup.Get("/", subscription.AdminListPricesHandler)
	adminPricesGroup.Get("/:id", subscription.AdminGetPriceHandler)
	adminPricesGroup.Post("/", subscription.CreatePriceHandler)
	adminPricesGroup.Put("/:id", subscription.UpdatePriceHandler)
	adminPricesGroup.Delete("/:id", subscription.DeletePriceHandler)

	// 优惠券管理
	adminCouponsGroup := adminGroup.Group("/coupons")
	adminCouponsGroup.Get("/", subscription.AdminListCouponsHandler)
	adminCouponsGroup.Get("/:code", subscription.AdminGetCouponHandler)
	adminCouponsGroup.Post("/", subscription.CreateCouponHandler)
	adminCouponsGroup.Put("/:code", subscription.UpdateCouponHandler)
	adminCouponsGroup.Delete("/:code", subscription.DeleteCouponHandler)

	// 订阅管理
	adminSubscriptionsGroup := adminGroup.Group("/subscriptions")
	adminSubscriptionsGroup.Get("/", subscription.AdminListSubscriptionsHandler)
	adminSubscriptionsGroup.Get("/:id", subscription.AdminGetSubscriptionHandler)
	adminSubscriptionsGroup.Put("/:id/cancel", subscription.AdminCancelSubscriptionHandler)
}
