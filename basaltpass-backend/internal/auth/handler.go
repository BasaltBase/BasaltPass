package auth

import (
	"log"

	"basaltpass-backend/internal/security"

	"github.com/gofiber/fiber/v2"
)

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
	result, err := svc.LoginV2(req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	if result.Need2FA {
		return c.JSON(fiber.Map{
			"need_2fa":              true,
			"2fa_type":              result.TwoFAType,
			"user_id":               result.UserID,
			"available_2fa_methods": result.Available2FAMethods,
		})
	}
	// Set refresh token as HttpOnly cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    result.TokenPair.RefreshToken,
		HTTPOnly: true,
		Secure:   false, // 在开发环境中设置为false，生产环境应该为true
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7天
		Domain:   "",               // 空字符串表示当前域
	})
	if err := security.RecordLoginSuccess(result.UserID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}
	return c.JSON(fiber.Map{"access_token": result.TokenPair.AccessToken})
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
		Secure:   false, // 在开发环境中设置为false，生产环境应该为true
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7天
		Domain:   "",               // 空字符串表示当前域
	})
	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})
}

// RequestResetHandler handles password reset code request
func RequestResetHandler(c *fiber.Ctx) error {
	var body struct {
		Identifier string `json:"identifier"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	code, err := RequestPasswordReset(body.Identifier)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"code": code}) // mock returns code directly
}

// ResetPasswordHandler handles actual password reset
func ResetPasswordHandler(c *fiber.Ctx) error {
	var body struct {
		Identifier string `json:"identifier"`
		Code       string `json:"code"`
		Password   string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := ResetPassword(body.Identifier, body.Code, body.Password); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// Verify2FAHandler handles POST /auth/verify-2fa
func Verify2FAHandler(c *fiber.Ctx) error {
	var req Verify2FARequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	tokens, err := svc.Verify2FA(req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
	})
	if err := security.RecordLoginSuccess(req.UserID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}
	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})
}

// DebugCookiesHandler for testing cookie state
func DebugCookiesHandler(c *fiber.Ctx) error {
	cookies := c.Request().Header.Cookie("refresh_token")
	allCookies := make(map[string]string)

	c.Request().Header.VisitAllCookie(func(key, value []byte) {
		allCookies[string(key)] = string(value)
	})

	return c.JSON(fiber.Map{
		"refresh_token":     string(cookies),
		"all_cookies":       allCookies,
		"has_refresh_token": len(cookies) > 0,
		"headers":           string(c.Request().Header.Header()),
	})
}
