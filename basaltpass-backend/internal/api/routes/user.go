package routes

import (
	"basaltpass-backend/internal/app_user"
	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/currency"
	"basaltpass-backend/internal/debug"
	"basaltpass-backend/internal/invitation"
	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/notification"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/order"
	"basaltpass-backend/internal/passkey"
	"basaltpass-backend/internal/payment"
	"basaltpass-backend/internal/security"
	"basaltpass-backend/internal/subscription"
	"basaltpass-backend/internal/tenant"
	"basaltpass-backend/internal/user"
	userTeam "basaltpass-backend/internal/user/team"
	"basaltpass-backend/internal/wallet"

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

	// 调试路由
	debugGroup := v1.Group("/debug", middleware.JWTMiddleware())
	debugGroup.Get("/user-tenant", debug.CheckUserTenantHandler)

	// 用户应用授权管理
	userGroup.Get("/apps", app_user.GetUserAppsHandler)
	userGroup.Delete("/apps/:app_id", app_user.RevokeUserAppHandler)

	// 认证相关路由
	authGroup := v1.Group("/auth")
	authGroup.Post("/register", auth.RegisterHandler)
	authGroup.Post("/login", auth.LoginHandler)
	authGroup.Post("/refresh", auth.RefreshHandler)
	authGroup.Post("/password/reset-request", auth.RequestResetHandler)
	authGroup.Post("/password/reset", auth.ResetPasswordHandler)
	authGroup.Post("/verify-2fa", auth.Verify2FAHandler)
	authGroup.Get("/debug/cookies", auth.DebugCookiesHandler) // 调试端点

	oauthGroup := v1.Group("/auth/oauth")
	oauthGroup.Get(":provider/login", oauth.LoginHandler)
	oauthGroup.Get(":provider/callback", oauth.CallbackHandler)

	// Passkey authentication routes
	passkeyGroup := v1.Group("/passkey")
	passkeyGroup.Post("/register/begin", middleware.JWTMiddleware(), passkey.BeginRegistrationHandler)
	passkeyGroup.Post("/register/finish", middleware.JWTMiddleware(), passkey.FinishRegistrationHandler)
	passkeyGroup.Post("/login/begin", passkey.BeginLoginHandler)
	passkeyGroup.Post("/login/finish", passkey.FinishLoginHandler)
	passkeyGroup.Get("/list", middleware.JWTMiddleware(), passkey.ListPasskeysHandler)
	passkeyGroup.Delete("/:id", middleware.JWTMiddleware(), passkey.DeletePasskeyHandler)

	// 用户搜索路由 (需要JWT认证)
	usersGroup := v1.Group("/users", middleware.JWTMiddleware())
	usersGroup.Get("/search", user.SearchHandler)

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

	// Invitation routes
	inv := v1.Group("/invitations", middleware.JWTMiddleware())
	inv.Get("/", invitation.ListIncomingHandler)
	inv.Put("/:id/accept", invitation.AcceptHandler)
	inv.Put("/:id/reject", invitation.RejectHandler)

	teamGroup.Post("/:id/invitations", invitation.CreateHandler)
	teamGroup.Get("/:id/invitations", invitation.ListOutgoingHandler)
	teamGroup.Delete("/:id/invitations/:inv_id", invitation.RevokeHandler)

	walletGroup := v1.Group("/wallet", middleware.JWTMiddleware())
	walletGroup.Get("/balance", wallet.BalanceHandler)
	walletGroup.Post("/recharge", wallet.RechargeHandler)
	walletGroup.Post("/withdraw", wallet.WithdrawHandler)
	walletGroup.Get("/history", wallet.HistoryHandler)

	// 货币系统路由（公开API，不需要认证）
	currencyGroup := v1.Group("/currencies")
	currencyGroup.Get("/", currency.GetCurrenciesHandler)
	currencyGroup.Get("/:code", currency.GetCurrencyHandler)

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

	// 安全设置路由
	securityGroup := v1.Group("/security", middleware.JWTMiddleware())
	securityGroup.Get("/status", security.GetSecurityStatusHandler)
	securityGroup.Post("/password/change", security.ChangePasswordHandler)
	securityGroup.Put("/contact", security.UpdateContactHandler)
	securityGroup.Post("/2fa/setup", security.SetupHandler)
	securityGroup.Post("/2fa/verify", security.VerifyHandler)
	securityGroup.Post("/2fa/disable", security.Disable2FAHandler)
	securityGroup.Post("/email/verify", security.VerifyEmailHandler)
	securityGroup.Post("/email/resend", security.SendEmailVerificationHandler)
	securityGroup.Post("/phone/verify", security.VerifyPhoneHandler)
	securityGroup.Post("/phone/resend", security.SendPhoneVerificationHandler)

	// 通知路由
	notifGroup := v1.Group("/notifications", middleware.JWTMiddleware())
	notifGroup.Get("/", notification.ListHandler)
	notifGroup.Get("/unread-count", notification.UnreadCountHandler)
	notifGroup.Put("/:id/read", notification.MarkAsReadHandler)
	notifGroup.Put("/mark-all-read", notification.MarkAllAsReadHandler)
	notifGroup.Delete("/:id", notification.DeleteHandler)

	// ========== 订阅系统路由 ==========
	// 产品和套餐路由（公开，无需认证）
	productsGroup := v1.Group("/products")
	productsGroup.Get("/", subscription.ListProductsHandler)
	productsGroup.Get("/:id", subscription.GetProductHandler)

	plansGroup := v1.Group("/plans")
	plansGroup.Get("/", subscription.ListPlansHandler)
	plansGroup.Get("/:id", subscription.GetPlanHandler)

	pricesGroup := v1.Group("/prices")
	pricesGroup.Get("/:id", subscription.GetPriceHandler)

	// 优惠券验证（无需认证）
	couponsGroup := v1.Group("/coupons")
	couponsGroup.Get("/:code/validate", subscription.ValidateCouponHandler)

	// 用户订阅相关路由（需要认证）
	subscriptionsGroup := v1.Group("/subscriptions", middleware.JWTMiddleware())
	subscriptionsGroup.Post("/", subscription.CreateSubscriptionHandler)
	subscriptionsGroup.Get("/", subscription.ListSubscriptionsHandler)
	subscriptionsGroup.Get("/:id", subscription.GetSubscriptionHandler)
	subscriptionsGroup.Put("/:id/cancel", subscription.CancelSubscriptionHandler)

	// 订阅结账路由
	subscriptionsGroup.Post("/checkout", subscription.CheckoutHandler)
	subscriptionsGroup.Post("/quick-checkout", subscription.QuickCheckoutHandler)

	// 使用记录路由（需要认证）
	usageGroup := v1.Group("/usage", middleware.JWTMiddleware())
	usageGroup.Post("/records", subscription.CreateUsageRecordHandler)
}
