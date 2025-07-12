package api

import (
	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/oauth"
	"basaltpass-backend/internal/security"
	"basaltpass-backend/internal/user"

	"github.com/gofiber/fiber/v2"
)

// RegisterRoutes attaches all versioned API routes to the Fiber app.
func RegisterRoutes(app *fiber.App) {
	v1 := app.Group("/api/v1")

	authGroup := v1.Group("/auth")
	authGroup.Post("/register", auth.RegisterHandler)
	authGroup.Post("/login", auth.LoginHandler)
	authGroup.Post("/refresh", auth.RefreshHandler)

	oauthGroup := v1.Group("/auth/oauth")
	oauthGroup.Get(":provider/login", oauth.LoginHandler)
	oauthGroup.Get(":provider/callback", oauth.CallbackHandler)

	userGroup := v1.Group("/user", common.JWTMiddleware())
	userGroup.Get("/profile", user.GetProfileHandler)
	userGroup.Put("/profile", user.UpdateProfileHandler)

	wallet := v1.Group("/wallet")
	wallet.Get("/balance", notImplemented)
	wallet.Post("/recharge", notImplemented)
	wallet.Post("/withdraw", notImplemented)

	securityGroup := v1.Group("/security", common.JWTMiddleware())
	securityGroup.Post("/2fa/setup", security.SetupHandler)
	securityGroup.Post("/2fa/verify", security.VerifyHandler)

	// Add more route groups as needed...
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
