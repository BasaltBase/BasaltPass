package api

import (
	"basaltpass-backend/internal/admin"
	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/rbac"
	"basaltpass-backend/internal/security"
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

	oauthGroup := v1.Group("/auth/oauth")
	oauthGroup.Get(":provider/login", oauth.LoginHandler)
	oauthGroup.Get(":provider/callback", oauth.CallbackHandler)

	userGroup := v1.Group("/user", common.JWTMiddleware())
	userGroup.Get("/profile", user.GetProfileHandler)
	userGroup.Put("/profile", user.UpdateProfileHandler)

	walletGroup := v1.Group("/wallet", common.JWTMiddleware())
	walletGroup.Get("/balance", wallet.BalanceHandler)
	walletGroup.Post("/recharge", wallet.RechargeHandler)
	walletGroup.Post("/withdraw", wallet.WithdrawHandler)
	walletGroup.Get("/history", wallet.HistoryHandler)

	securityGroup := v1.Group("/security", common.JWTMiddleware())
	securityGroup.Post("/2fa/setup", security.SetupHandler)
	securityGroup.Post("/2fa/verify", security.VerifyHandler)

	adminGroup := v1.Group("/admin", common.JWTMiddleware(), common.AdminMiddleware())
	adminGroup.Get("/roles", rbac.ListRolesHandler)
	adminGroup.Post("/roles", rbac.CreateRoleHandler)
	adminGroup.Post("/user/:id/role", rbac.AssignRoleHandler)
	adminGroup.Get("/users", admin.ListUsersHandler)
	adminGroup.Post("/user/:id/ban", admin.BanUserHandler)
	adminGroup.Get("/wallets", admin.ListWalletTxHandler)
	adminGroup.Post("/tx/:id/approve", admin.ApproveTxHandler)
	adminGroup.Get("/logs", admin.ListAuditHandler)

	// Add more route groups as needed...
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
