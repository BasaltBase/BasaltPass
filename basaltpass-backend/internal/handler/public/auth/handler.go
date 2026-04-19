package auth

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	security "basaltpass-backend/internal/handler/user/security"
	"basaltpass-backend/internal/model"
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

// RegisterHandler handles POST /auth/register (DEPRECATED - use /signup/start instead) 用于兼容非标准客户端的注册请求
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

type switchUserTenantIdentityRequest struct {
	TenantID *uint `json:"tenant_id"`
}

// SwitchUserTenantIdentityHandler switches the active tenant identity inside user console.
// POST /api/v1/auth/identity/switch (JWT required, user scope)
func SwitchUserTenantIdentityHandler(c *fiber.Ctx) error {
	scope := normalizeScope(strings.TrimSpace(c.Get("X-Auth-Scope")))
	if scope == "" {
		if claimScope, ok := c.Locals("scope").(string); ok {
			scope = normalizeScope(claimScope)
		}
	}
	if scope != auth2.ConsoleScopeUser {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "user scope required"})
	}

	uidAny := c.Locals("userID")
	uid, ok := uidAny.(uint)
	if !ok || uid == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req switchUserTenantIdentityRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.TenantID == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id is required"})
	}
	targetTenantID := *req.TenantID

	var user model.User
	if err := common.DB().Select("id", "tenant_id").First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not found"})
	}

	if targetTenantID == 0 {
		if user.TenantID != 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant account cannot switch to global identity"})
		}
	} else if user.TenantID != targetTenantID {
		var membershipCount int64
		if err := common.DB().Model(&model.TenantUser{}).
			Where("user_id = ? AND tenant_id = ? AND role IN ?", uid, targetTenantID, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin, model.TenantRoleMember, model.TenantRoleUser}).
			Count(&membershipCount).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate tenant identity"})
		}
		if membershipCount == 0 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant identity not available"})
		}
	}

	tokens, err := auth2.GenerateTokenPairWithTenantAndScope(uid, targetTenantID, auth2.ConsoleScopeUser)
	if err != nil {
		if errors.Is(err, auth2.ErrTenantLoginDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to switch identity"})
	}

	setAuthCookies(c, auth2.ConsoleScopeUser, tokens.AccessToken, tokens.RefreshToken)
	return c.JSON(fiber.Map{
		"access_token": tokens.AccessToken,
		"tenant_id":    targetTenantID,
		"scope":        auth2.ConsoleScopeUser,
	})
}

// LoginHandler handles POST /auth/login
func LoginHandler(c *fiber.Ctx) error {
	var req auth2.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	req.Scope = normalizeScope(c.Get("X-Auth-Scope"))
	// Hydrate legacy fields for backward compatibility with old clients.
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
		if errors.Is(err, auth2.ErrTenantAccountOnly) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		if errors.Is(err, auth2.ErrTenantLoginDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	if result.Need2FA {
		// Return pre_auth_token instead of user_id to prevent client-side user ID substitution.
		// The 2FA step must echo this token back; the server extracts user identity from it.
		return c.JSON(fiber.Map{
			"need_2fa":              true,
			"2fa_type":              result.TwoFAType,
			"pre_auth_token":        result.PreAuthToken,
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
		if errors.Is(err, auth2.ErrTenantLoginDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	setAuthCookies(c, scope, tokens.AccessToken, tokens.RefreshToken)

	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})
}

// Verify2FAHandler handles POST /auth/verify-2fa
func Verify2FAHandler(c *fiber.Ctx) error {
	var req auth2.Verify2FARequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	tokens, err := svc.Verify2FA(req)
	if err != nil {
		if errors.Is(err, auth2.ErrTenantLoginDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}
	setAuthCookies(c, c.Get("X-Auth-Scope"), tokens.AccessToken, tokens.RefreshToken)

	// Extract user identity from the pre_auth_token (already validated inside Verify2FA).
	// ParsePreAuthToken will not fail here because Verify2FA already succeeded.
	userID, _, _ := auth2.ParsePreAuthToken(req.PreAuthToken)

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
				"id": userID,
			},
		},
	})
}
