package auth

import "github.com/gofiber/fiber/v2"

var svc = Service{}

// RegisterHandler handles POST /auth/register
func RegisterHandler(c *fiber.Ctx) error {
	var req RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	user, err := svc.Register(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"id": user.ID})
}

// LoginHandler handles POST /auth/login
func LoginHandler(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	tokens, err := svc.Login(req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	// Set refresh token as HttpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
	})

	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})

}

// RefreshHandler handles POST /auth/refresh
func RefreshHandler(c *fiber.Ctx) error {
	rt := c.Cookies("refresh_token")
	if rt == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}
	tokens, err := svc.Refresh(rt)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	// update refresh token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
	})
	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})
}
