package auth

import (
	"errors"
	"os"
	"strings"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	authsvc "basaltpass-backend/internal/service/auth"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type consoleAuthorizeRequest struct {
	Target   string `json:"target"`
	TenantID *uint  `json:"tenant_id,omitempty"`
}

type consoleAuthorizeResponse struct {
	Code   string `json:"code"`
	Target string `json:"target"`
}

type consoleExchangeRequest struct {
	Code string `json:"code"`
}

func getJWTSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	if os.Getenv("BASALTPASS_DYNO_MODE") == "test" {
		return "test-secret"
	}
	panic("JWT_SECRET environment variable is required")
}

func normalizeTarget(t string) string {
	t = strings.TrimSpace(strings.ToLower(t))
	return t
}

func userDefaultTenantID(userID uint) (uint, error) {
	var ta model.TenantAdmin
	if err := common.DB().Where("user_id = ?", userID).Order("created_at ASC").First(&ta).Error; err != nil {
		return 0, err
	}
	return ta.TenantID, nil
}

func userHasTenant(userID uint, tenantID uint) (bool, error) {
	if tenantID == 0 {
		return false, nil
	}

	var cnt int64
	err := common.DB().Model(&model.TenantAdmin{}).
		Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		Count(&cnt).Error
	if err != nil {
		return false, err
	}
	return cnt > 0, nil
}

func mustGetUserID(c *fiber.Ctx) (uint, error) {
	uidVal := c.Locals("userID")
	if uidVal == nil {
		return 0, errors.New("unauthenticated")
	}
	uid, ok := uidVal.(uint)
	if !ok {
		return 0, errors.New("invalid user context")
	}
	return uid, nil
}

// ConsoleAuthorizeHandler issues a short-lived console switch code.
//
// POST /api/v1/auth/console/authorize (JWT required)
// Body: { target: "tenant"|"admin", tenant_id?: number }
//
// This endpoint does NOT mint a tenant/admin access token; it only returns a short-lived code.
func ConsoleAuthorizeHandler(c *fiber.Ctx) error {
	uid, err := mustGetUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	var req consoleAuthorizeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	req.Target = normalizeTarget(req.Target)
	if req.Target != authsvc.ConsoleScopeTenant && req.Target != authsvc.ConsoleScopeAdmin {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid target"})
	}

	// Resolve and validate tenant/admin eligibility
	var tenantID uint
	if req.Target == authsvc.ConsoleScopeTenant {
		if req.TenantID != nil {
			tenantID = *req.TenantID
			ok, err := userHasTenant(uid, tenantID)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate tenant access"})
			}
			if !ok {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant access required"})
			}
		} else {
			tid, err := userDefaultTenantID(uid)
			if err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant access required"})
			}
			tenantID = tid
		}
	} else {
		// admin
		var user model.User
		if err := common.DB().First(&user, uid).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not found"})
		}
		if !user.IsSuperAdmin() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "super admin required"})
		}
		tenantID = 0 // admin scope stays unbound
	}

	claims := jwt.MapClaims{
		"sub": uid,
		"tid": tenantID,
		"scp": req.Target,
		"typ": "console_code",
		"exp": time.Now().Add(30 * time.Second).Unix(),
	}
	code, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(getJWTSecret()))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to sign code"})
	}

	return c.JSON(consoleAuthorizeResponse{Code: code, Target: req.Target})
}

// ConsoleExchangeHandler exchanges a console code for a scoped token pair.
//
// POST /api/v1/auth/console/exchange (no JWT required)
// Body: { code: "..." }
func ConsoleExchangeHandler(c *fiber.Ctx) error {
	var req consoleExchangeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if strings.TrimSpace(req.Code) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing code"})
	}

	tok, err := jwt.Parse(req.Code, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return []byte(getJWTSecret()), nil
	})
	if err != nil || !tok.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid code"})
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid code"})
	}
	if claims["typ"] != "console_code" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid code type"})
	}

	uidFloat, ok := claims["sub"].(float64)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid subject"})
	}
	uid := uint(uidFloat)

	scope, _ := claims["scp"].(string)
	scope = normalizeTarget(scope)
	if scope != authsvc.ConsoleScopeTenant && scope != authsvc.ConsoleScopeAdmin {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid scope"})
	}

	var tenantID uint
	if tid, ok := claims["tid"].(float64); ok {
		tenantID = uint(tid)
	}

	// Re-check authorization at exchange time
	if scope == authsvc.ConsoleScopeTenant {
		if tenantID == 0 {
			tid, err := userDefaultTenantID(uid)
			if err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant access required"})
			}
			tenantID = tid
		}
		ok, err := userHasTenant(uid, tenantID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate tenant access"})
		}
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant access required"})
		}
	} else {
		var user model.User
		if err := common.DB().First(&user, uid).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user not found"})
		}
		if !user.IsSuperAdmin() {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "super admin required"})
		}
		tenantID = 0
	}

	tokens, err := authsvc.GenerateTokenPairWithTenantAndScope(uid, tenantID, scope)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate tokens"})
	}

	// Set scoped refresh cookie for this console
	isProd := config.IsProduction()
	refreshCookie := "refresh_token_" + scope
	accessCookie := "access_token_" + scope
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookie,
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		Domain:   "",
	})
	c.Cookie(&fiber.Cookie{
		Name:     accessCookie,
		Value:    tokens.AccessToken,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   15 * 60,
		Domain:   "",
	})

	return c.JSON(fiber.Map{
		"access_token": tokens.AccessToken,
		"scope":        scope,
	})
}
