package api

import (
	"basaltpass-backend/internal/admin"
	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/invitation"
	"basaltpass-backend/internal/notification"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/passkey"
	"basaltpass-backend/internal/rbac"
	"basaltpass-backend/internal/security"
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
