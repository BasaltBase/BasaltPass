package api

import "github.com/gofiber/fiber/v2"

// RegisterRoutes attaches all versioned API routes to the Fiber app.
func RegisterRoutes(app *fiber.App) {
	v1 := app.Group("/api/v1")

	auth := v1.Group("/auth")
	auth.Post("/register", notImplemented)
	auth.Post("/login", notImplemented)

	user := v1.Group("/user")
	user.Get("/profile", notImplemented)

	wallet := v1.Group("/wallet")
	wallet.Get("/balance", notImplemented)
	wallet.Post("/recharge", notImplemented)
	wallet.Post("/withdraw", notImplemented)

	// Add more route groups as needed...
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
