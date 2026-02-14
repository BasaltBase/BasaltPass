package auth

import (
	"basaltpass-backend/internal/config"
	security "basaltpass-backend/internal/handler/user/security"
	auth2 "basaltpass-backend/internal/service/auth"
	"errors"
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var svc = auth2.Service{}

func firstNonEmptyString(payload map[string]interface{}, keys ...string) string {
	for _, key := range keys {
		value, ok := payload[key]
		if !ok {
			continue
		}
		if s, ok := value.(string); ok {
			s = strings.TrimSpace(s)
			if s != "" {
				return s
			}
		}
	}
	return ""
}

func hydrateLegacyLoginFields(c *fiber.Ctx, req *auth2.LoginRequest) {
	if strings.TrimSpace(req.EmailOrPhone) != "" && strings.TrimSpace(req.Password) != "" {
		return
	}

	var raw map[string]interface{}
	if err := c.BodyParser(&raw); err != nil {
		return
	}

	if strings.TrimSpace(req.EmailOrPhone) == "" {
		req.EmailOrPhone = firstNonEmptyString(raw, "identifier", "email_or_phone", "email", "username", "phone", "account")
	}
	if strings.TrimSpace(req.Password) == "" {
		req.Password = firstNonEmptyString(raw, "password", "pass", "pwd")
	}
}

func normalizeScope(raw string) string {
	scope := strings.ToLower(strings.TrimSpace(raw))
	switch scope {
	case "tenant", "admin", "user":
		return scope
	default:
		return "user"
	}
}

func setCookie(c *fiber.Ctx, name, value string, maxAge int, isProd bool) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    value,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   maxAge,
		Domain:   "",
	})
}

func setAuthCookies(c *fiber.Ctx, scope, accessToken, refreshToken string) {
	isProd := config.IsProduction()
	normalizedScope := normalizeScope(scope)

	// Keep unscoped cookies for OAuth hosted login compatibility.
	setCookie(c, "refresh_token", refreshToken, 7*24*60*60, isProd)
	setCookie(c, "access_token", accessToken, 15*60, isProd)

	// Also set scope-specific cookies for tenant/admin consoles.
	if normalizedScope != "user" {
		setCookie(c, "refresh_token_"+normalizedScope, refreshToken, 7*24*60*60, isProd)
		setCookie(c, "access_token_"+normalizedScope, accessToken, 15*60, isProd)
	}
}

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
	hydrateLegacyLoginFields(c, &req)

	result, err := svc.LoginV2(req)
	if err != nil {
		if errors.Is(err, auth2.ErrMissingCredentials) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, auth2.ErrServiceUnavailable) {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"error": auth2.ErrServiceUnavailable.Error(),
			})
		}
		if errors.Is(err, auth2.ErrPlatformAdminOnly) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
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
	setAuthCookies(c, c.Get("X-Auth-Scope"), result.TokenPair.AccessToken, result.TokenPair.RefreshToken)

	userID := result.UserID
	clientIP := c.IP()
	userAgent := c.Get("User-Agent")
	go func() {
		if err := security.RecordLoginSuccess(userID, clientIP, userAgent); err != nil {
			log.Printf("failed to record login history: %v", err)
		}
	}()

	return c.JSON(fiber.Map{
		"access_token": result.TokenPair.AccessToken,
		"data": fiber.Map{
			"token": result.TokenPair.AccessToken,
			"user": fiber.Map{
				"id": result.UserID,
			},
		},
	})
}

// RefreshHandler handles POST /auth/refresh
func RefreshHandler(c *fiber.Ctx) error {
	// Scope-aware refresh: for tenant/admin consoles, use dedicated refresh cookies.
	scope := normalizeScope(c.Get("X-Auth-Scope"))
	cookieName := "refresh_token"
	if scope != "user" {
		cookieName = "refresh_token_" + scope
	}

	rt := c.Cookies(cookieName)
	if rt == "" && scope != "user" {
		// Backward compatibility for old login cookies.
		rt = c.Cookies("refresh_token")
	}
	if rt == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}
	tokens, err := svc.Refresh(rt)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	setAuthCookies(c, scope, tokens.AccessToken, tokens.RefreshToken)

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
	setAuthCookies(c, c.Get("X-Auth-Scope"), tokens.AccessToken, tokens.RefreshToken)
	userID := req.UserID
	clientIP := c.IP()
	userAgent := c.Get("User-Agent")
	go func() {
		if err := security.RecordLoginSuccess(userID, clientIP, userAgent); err != nil {
			log.Printf("failed to record login history: %v", err)
		}
	}()
	return c.JSON(fiber.Map{
		"access_token": tokens.AccessToken,
		"data": fiber.Map{
			"token": tokens.AccessToken,
			"user": fiber.Map{
				"id": req.UserID,
			},
		},
	})
}
