package auth

import (
	"basaltpass-backend/internal/config"
	security "basaltpass-backend/internal/handler/user/security"
	auth2 "basaltpass-backend/internal/service/auth"
	"log"

	"github.com/gofiber/fiber/v2"
)

var svc = auth2.Service{}

// RegisterHandler handles POST /auth/register (DEPRECATED - use /signup/start instead)
func RegisterHandler(c *fiber.Ctx) error {
	// 旧的注册API已被弃用，重定向到新的验证码流程
	return c.Status(fiber.StatusGone).JSON(fiber.Map{
		"error":        "This registration endpoint has been deprecated. Please use the new verification-based registration flow.",
		"message":      "请使用新的邮箱验证注册流程。访问 /register 页面进行注册。",
		"new_endpoint": "/api/v1/signup/start",
	})
}

// LoginHandler handles POST /auth/login
func LoginHandler(c *fiber.Ctx) error {
	var req auth2.LoginRequest
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
	isProd := config.IsProduction()
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    result.TokenPair.RefreshToken,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7天
		Domain:   "",               // 空字符串表示当前域
	})

	// 同时设置 access_token cookie 以提供更安全的存储选项
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    result.TokenPair.AccessToken,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   15 * 60, // 15分钟
		Domain:   "",
	})

	if err := security.RecordLoginSuccess(result.UserID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}
	return c.JSON(fiber.Map{"access_token": result.TokenPair.AccessToken})
}

// RefreshHandler handles POST /auth/refresh
func RefreshHandler(c *fiber.Ctx) error {
	// Scope-aware refresh: for tenant/admin consoles, use dedicated refresh cookies.
	scope := c.Get("X-Auth-Scope")
	if scope == "" {
		scope = "user"
	}
	cookieName := "refresh_token"
	if scope != "user" {
		cookieName = "refresh_token_" + scope
	}

	rt := c.Cookies(cookieName)
	if rt == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}
	tokens, err := svc.Refresh(rt)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	// update refresh token cookie
	isProd := config.IsProduction()
	c.Cookie(&fiber.Cookie{
		Name:     cookieName,
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60, // 7天
		Domain:   "",               // 空字符串表示当前域
	})

	// 更新 access_token cookie（非鉴权来源，仅用于调试/兼容）
	accessCookieName := "access_token"
	if scope != "user" {
		accessCookieName = "access_token_" + scope
	}
	c.Cookie(&fiber.Cookie{
		Name:     accessCookieName,
		Value:    tokens.AccessToken,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   15 * 60, // 15分钟
		Domain:   "",
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
	var req auth2.Verify2FARequest
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
