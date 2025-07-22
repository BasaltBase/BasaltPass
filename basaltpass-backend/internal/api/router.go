package api

import (
	"basaltpass-backend/internal/admin"
	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/invitation"
	"basaltpass-backend/internal/notification"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/order"
	"basaltpass-backend/internal/passkey"
	"basaltpass-backend/internal/payment"
	"basaltpass-backend/internal/rbac"
	"basaltpass-backend/internal/security"
	"basaltpass-backend/internal/subscription"
	"basaltpass-backend/internal/team"
	"basaltpass-backend/internal/user"
	"basaltpass-backend/internal/wallet"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes attaches all versioned API routes to the Fiber app.
func RegisterRoutes(app *fiber.App) {
	v1 := app.Group("/api/v1")

	authGroup := v1.Group("/auth")
	authGroup.Post("/register", auth.RegisterHandler)
	authGroup.Post("/login", auth.LoginHandler)
	authGroup.Post("/refresh", auth.RefreshHandler)
	authGroup.Post("/password/reset-request", auth.RequestResetHandler)
	authGroup.Post("/password/reset", auth.ResetPasswordHandler)
	authGroup.Post("/verify-2fa", auth.Verify2FAHandler)

	oauthGroup := v1.Group("/auth/oauth")
	oauthGroup.Get(":provider/login", oauth.LoginHandler)
	oauthGroup.Get(":provider/callback", oauth.CallbackHandler)

	// OAuth2授权服务器端点
	oauthServerGroup := app.Group("/oauth")
	oauthServerGroup.Get("/authorize", oauth.AuthorizeHandler)
	oauthServerGroup.Post("/consent", common.JWTMiddleware(), oauth.ConsentHandler)
	oauthServerGroup.Post("/token", oauth.TokenHandler)
	oauthServerGroup.Get("/userinfo", oauth.UserInfoHandler)
	oauthServerGroup.Post("/introspect", oauth.IntrospectHandler)
	oauthServerGroup.Post("/revoke", oauth.RevokeHandler)

	// Passkey authentication routes
	passkeyGroup := v1.Group("/passkey")
	passkeyGroup.Post("/register/begin", common.JWTMiddleware(), passkey.BeginRegistrationHandler)
	passkeyGroup.Post("/register/finish", common.JWTMiddleware(), passkey.FinishRegistrationHandler)
	passkeyGroup.Post("/login/begin", passkey.BeginLoginHandler)
	passkeyGroup.Post("/login/finish", passkey.FinishLoginHandler)
	passkeyGroup.Get("/list", common.JWTMiddleware(), passkey.ListPasskeysHandler)
	passkeyGroup.Delete("/:id", common.JWTMiddleware(), passkey.DeletePasskeyHandler)

	userGroup := v1.Group("/user", common.JWTMiddleware())
	userGroup.Get("/profile", user.GetProfileHandler)
	userGroup.Put("/profile", user.UpdateProfileHandler)

	// 用户搜索路由 (需要JWT认证)
	usersGroup := v1.Group("/users", common.JWTMiddleware())
	usersGroup.Get("/search", user.SearchHandler)

	// 团队相关路由
	teamGroup := v1.Group("/teams", common.JWTMiddleware())
	teamGroup.Post("/", team.CreateTeamHandler)
	teamGroup.Get("/", team.GetUserTeamsHandler)
	teamGroup.Get("/:id", team.GetTeamHandler)
	teamGroup.Put("/:id", team.UpdateTeamHandler)
	teamGroup.Delete("/:id", team.DeleteTeamHandler)
	teamGroup.Get("/:id/members", team.GetTeamMembersHandler)
	teamGroup.Post("/:id/members", team.AddMemberHandler)
	teamGroup.Put("/:id/members/:member_id", team.UpdateMemberRoleHandler)
	teamGroup.Delete("/:id/members/:member_id", team.RemoveMemberHandler)
	teamGroup.Post("/:id/leave", team.LeaveTeamHandler)

	// Invitation routes
	inv := v1.Group("/invitations", common.JWTMiddleware())
	inv.Get("/", invitation.ListIncomingHandler)
	inv.Put("/:id/accept", invitation.AcceptHandler)
	inv.Put("/:id/reject", invitation.RejectHandler)

	teamGroup.Post("/:id/invitations", invitation.CreateHandler)
	teamGroup.Get("/:id/invitations", invitation.ListOutgoingHandler)
	teamGroup.Delete("/:id/invitations/:inv_id", invitation.RevokeHandler)

	walletGroup := v1.Group("/wallet", common.JWTMiddleware())
	walletGroup.Get("/balance", wallet.BalanceHandler)
	walletGroup.Post("/recharge", wallet.RechargeHandler)
	walletGroup.Post("/withdraw", wallet.WithdrawHandler)
	walletGroup.Get("/history", wallet.HistoryHandler)

	// 支付系统路由（需要认证）
	paymentGroup := v1.Group("/payment", common.JWTMiddleware())
	paymentGroup.Post("/intents", payment.CreatePaymentIntentHandler)
	paymentGroup.Get("/intents", payment.ListPaymentIntentsHandler)
	paymentGroup.Get("/intents/:id", payment.GetPaymentIntentHandler)
	paymentGroup.Post("/sessions", payment.CreatePaymentSessionHandler)
	paymentGroup.Get("/sessions/:session_id", payment.GetPaymentSessionHandler)

	// 支付页面和模拟支付路由（无需认证，模拟真实Stripe行为）
	app.Get("/payment/checkout/:session_id", payment.PaymentCheckoutHandler)
	app.Post("/payment/simulate/:session_id", payment.SimulatePaymentHandler)

	// 订单系统路由
	orderGroup := v1.Group("/orders", common.JWTMiddleware())
	orderGroup.Post("/", order.CreateOrderHandler)
	orderGroup.Get("/", order.ListOrdersHandler)
	orderGroup.Get("/:id", order.GetOrderHandler)
	orderGroup.Get("/number/:number", order.GetOrderByNumberHandler)

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
	subscriptionsGroup := v1.Group("/subscriptions", common.JWTMiddleware())
	subscriptionsGroup.Post("/", subscription.CreateSubscriptionHandler)
	subscriptionsGroup.Get("/", subscription.ListSubscriptionsHandler)
	subscriptionsGroup.Get("/:id", subscription.GetSubscriptionHandler)
	subscriptionsGroup.Put("/:id/cancel", subscription.CancelSubscriptionHandler)

	// 订阅结账路由
	subscriptionsGroup.Post("/checkout", subscription.CheckoutHandler)
	subscriptionsGroup.Post("/quick-checkout", subscription.QuickCheckoutHandler)

	// 使用记录路由（需要认证）
	usageGroup := v1.Group("/usage", common.JWTMiddleware())
	usageGroup.Post("/records", subscription.CreateUsageRecordHandler)

	securityGroup := v1.Group("/security", common.JWTMiddleware())
	// 安全状态
	securityGroup.Get("/status", security.GetSecurityStatusHandler)

	// 密码管理
	securityGroup.Post("/password/change", security.ChangePasswordHandler)

	// 联系方式管理
	securityGroup.Put("/contact", security.UpdateContactHandler)

	// 2FA管理
	securityGroup.Post("/2fa/setup", security.SetupHandler)
	securityGroup.Post("/2fa/verify", security.VerifyHandler)
	securityGroup.Post("/2fa/disable", security.Disable2FAHandler)

	// 邮箱验证
	securityGroup.Post("/email/verify", security.VerifyEmailHandler)
	securityGroup.Post("/email/resend", security.SendEmailVerificationHandler)

	// 手机验证
	securityGroup.Post("/phone/verify", security.VerifyPhoneHandler)
	securityGroup.Post("/phone/resend", security.SendPhoneVerificationHandler)

	adminGroup := v1.Group("/admin", common.JWTMiddleware(), common.AdminMiddleware())
	adminGroup.Get("/roles", rbac.ListRolesHandler)
	adminGroup.Post("/roles", rbac.CreateRoleHandler)
	adminGroup.Post("/user/:id/role", rbac.AssignRoleHandler)
	adminGroup.Get("/users", admin.ListUsersHandler)
	adminGroup.Post("/user/:id/ban", admin.BanUserHandler)
	adminGroup.Get("/wallets", admin.ListWalletTxHandler)
	adminGroup.Post("/tx/:id/approve", admin.ApproveTxHandler)
	adminGroup.Get("/logs", admin.ListAuditHandler)

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

	// 通知路由
	notifGroup := v1.Group("/notifications", common.JWTMiddleware())
	notifGroup.Get("/", notification.ListHandler)
	notifGroup.Get("/unread-count", notification.UnreadCountHandler)
	notifGroup.Put("/:id/read", notification.MarkAsReadHandler)
	notifGroup.Put("/mark-all-read", notification.MarkAllAsReadHandler)
	notifGroup.Delete("/:id", notification.DeleteHandler)

	// 管理员通知路由
	adminNotif := adminGroup.Group("/notifications")
	adminNotif.Post("/", notification.AdminCreateHandler)
	adminNotif.Get("/", notification.AdminListHandler)
	adminNotif.Delete("/:id", notification.AdminDeleteHandler)

	// OAuth2客户端管理路由
	oauthClientGroup := adminGroup.Group("/oauth/clients")
	oauthClientGroup.Post("/", oauth.CreateClientHandler)
	oauthClientGroup.Get("/", oauth.ListClientsHandler)
	oauthClientGroup.Get("/:client_id", oauth.GetClientHandler)
	oauthClientGroup.Put("/:client_id", oauth.UpdateClientHandler)
	oauthClientGroup.Delete("/:client_id", oauth.DeleteClientHandler)
	oauthClientGroup.Post("/:client_id/regenerate-secret", oauth.RegenerateSecretHandler)
	oauthClientGroup.Get("/:client_id/stats", oauth.GetClientStatsHandler)
	oauthClientGroup.Get("/:client_id/tokens", oauth.GetTokensHandler)
	oauthClientGroup.Post("/:client_id/revoke-tokens", oauth.RevokeClientTokensHandler)

	// Add more route groups as needed...
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
