package routes

import (
	"basaltpass-backend/internal/handler/tenant"
	"basaltpass-backend/internal/handler/user"
	userNotif "basaltpass-backend/internal/handler/user/notification"
	userSecurity "basaltpass-backend/internal/handler/user/security"
	userTeam "basaltpass-backend/internal/handler/user/team"
	"basaltpass-backend/internal/middleware"

	"basaltpass-backend/internal/public/app/app_user"
	"basaltpass-backend/internal/public/invitation"
	"basaltpass-backend/internal/public/order"
	"basaltpass-backend/internal/public/payment"
	subscription2 "basaltpass-backend/internal/public/subscription"
	"basaltpass-backend/internal/public/wallet"

	"github.com/gofiber/fiber/v2"
)

// RegisterUserRoutes 注册用户相关路由
func RegisterUserRoutes(v1 fiber.Router) {

	// 用户租户管理
	userGroup := v1.Group("/user", middleware.JWTMiddleware())
	userGroup.Get("/tenants", tenant.GetUserTenantsHandler)
	userGroup.Get("/profile", user.GetProfileHandler)
	userGroup.Get("/debug", user.DebugUserHandler) // 临时调试端点
	userGroup.Put("/profile", user.UpdateProfileHandler)

	// 用户应用授权管理
	userGroup.Get("/apps", app_user.GetUserAppsHandler)
	userGroup.Delete("/apps/:app_id", app_user.RevokeUserAppHandler)

	// 用户搜索路由 (需要JWT认证)
	usersGroup := v1.Group("/users", middleware.JWTMiddleware())
	usersGroup.Get("/search", user.SearchHandler)

	// 安全设置路由
	securityGroup := v1.Group("/security", middleware.JWTMiddleware())
	securityGroup.Get("/status", userSecurity.GetSecurityStatusHandler)
	securityGroup.Post("/password/change", userSecurity.ChangePasswordHandler)
	securityGroup.Put("/contact", userSecurity.UpdateContactHandler)
	securityGroup.Post("/2fa/setup", userSecurity.SetupHandler)
	securityGroup.Post("/2fa/verify", userSecurity.VerifyHandler)
	securityGroup.Post("/2fa/disable", userSecurity.Disable2FAHandler)
	securityGroup.Post("/email/verify", userSecurity.VerifyEmailHandler)
	securityGroup.Post("/email/resend", userSecurity.SendEmailVerificationHandler)
	securityGroup.Post("/phone/verify", userSecurity.VerifyPhoneHandler)
	securityGroup.Post("/phone/resend", userSecurity.SendPhoneVerificationHandler)

	// 通知路由
	notifGroup := v1.Group("/notifications", middleware.JWTMiddleware())
	notifGroup.Get("/", userNotif.ListHandler)
	notifGroup.Get("/unread-count", userNotif.UnreadCountHandler)
	notifGroup.Put("/:id/read", userNotif.MarkAsReadHandler)
	notifGroup.Put("/mark-all-read", userNotif.MarkAllAsReadHandler)
	notifGroup.Delete("/:id", userNotif.DeleteHandler)

	// 团队相关路由
	teamGroup := v1.Group("/teams", middleware.JWTMiddleware())
	teamGroup.Post("/", userTeam.CreateTeamHandler)
	teamGroup.Get("/", userTeam.GetUserTeamsHandler)
	teamGroup.Get("/:id", userTeam.GetTeamHandler)
	teamGroup.Put("/:id", userTeam.UpdateTeamHandler)
	teamGroup.Delete("/:id", userTeam.DeleteTeamHandler)
	teamGroup.Get("/:id/members", userTeam.GetTeamMembersHandler)
	teamGroup.Post("/:id/members", userTeam.AddMemberHandler)
	teamGroup.Put("/:id/members/:member_id", userTeam.UpdateMemberRoleHandler)
	teamGroup.Delete("/:id/members/:member_id", userTeam.RemoveMemberHandler)
	teamGroup.Post("/:id/leave", userTeam.LeaveTeamHandler)
	teamGroup.Post("/:id/invitations", invitation.CreateHandler)
	teamGroup.Get("/:id/invitations", invitation.ListOutgoingHandler)
	teamGroup.Delete("/:id/invitations/:inv_id", invitation.RevokeHandler)

	// Invitation routes
	inv := v1.Group("/invitations", middleware.JWTMiddleware())
	inv.Get("/", invitation.ListIncomingHandler)
	inv.Put("/:id/accept", invitation.AcceptHandler)
	inv.Put("/:id/reject", invitation.RejectHandler)

	// ========== 钱包以及订阅系统路由 ==========

	// 钱包用户系统路由（需要认证）
	walletGroup := v1.Group("/wallet", middleware.JWTMiddleware())
	walletGroup.Get("/balance", wallet.BalanceHandler)
	walletGroup.Post("/recharge", wallet.RechargeHandler)
	walletGroup.Post("/withdraw", wallet.WithdrawHandler)
	walletGroup.Get("/history", wallet.HistoryHandler)

	// 支付系统路由（需要认证）
	paymentGroup := v1.Group("/payment", middleware.JWTMiddleware())
	paymentGroup.Post("/intents", payment.CreatePaymentIntentHandler)
	paymentGroup.Get("/intents", payment.ListPaymentIntentsHandler)
	paymentGroup.Get("/intents/:id", payment.GetPaymentIntentHandler)
	paymentGroup.Post("/sessions", payment.CreatePaymentSessionHandler)
	paymentGroup.Get("/sessions/:session_id", payment.GetPaymentSessionHandler)

	// 订单系统路由
	orderGroup := v1.Group("/orders", middleware.JWTMiddleware())
	orderGroup.Post("/", order.CreateOrderHandler)
	orderGroup.Get("/", order.ListOrdersHandler)
	orderGroup.Get("/:id", order.GetOrderHandler)
	orderGroup.Get("/number/:number", order.GetOrderByNumberHandler)

	// 产品相关路由
	productsGroup := v1.Group("/products")
	productsGroup.Get("/", subscription2.ListProductsHandler)
	productsGroup.Get("/:id", subscription2.GetProductHandler)

	// 套餐相关路由
	plansGroup := v1.Group("/plans")
	plansGroup.Get("/", subscription2.ListPlansHandler)
	plansGroup.Get("/:id", subscription2.GetPlanHandler)

	// 价格相关路由
	pricesGroup := v1.Group("/prices")
	pricesGroup.Get("/", subscription2.ListPricesHandler)
	pricesGroup.Get("/:id", subscription2.GetPriceHandler)

	// 优惠券验证（无需认证）
	couponsGroup := v1.Group("/coupons")
	couponsGroup.Get("/:code/validate", subscription2.ValidateCouponHandler)

	// 用户订阅相关路由（需要认证）
	subscriptionsGroup := v1.Group("/subscriptions", middleware.JWTMiddleware())
	subscriptionsGroup.Post("/", subscription2.CreateSubscriptionHandler)
	subscriptionsGroup.Get("/", subscription2.ListSubscriptionsHandler)
	subscriptionsGroup.Get("/:id", subscription2.GetSubscriptionHandler)
	subscriptionsGroup.Put("/:id/cancel", subscription2.CancelSubscriptionHandler)

	// 订阅结账路由
	subscriptionsGroup.Post("/checkout", subscription2.CheckoutHandler)
	subscriptionsGroup.Post("/quick-checkout", subscription2.QuickCheckoutHandler)

	// 使用记录路由（需要认证）
	usageGroup := v1.Group("/usage", middleware.JWTMiddleware())
	usageGroup.Post("/records", subscription2.CreateUsageRecordHandler)
}
