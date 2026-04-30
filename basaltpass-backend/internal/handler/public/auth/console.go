package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"log"
	"strings"
	"sync"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	authsvc "basaltpass-backend/internal/service/auth"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type consoleCodeState struct {
	ExpiresAt int64
	Used      bool
}

var (
	consoleCodeMu    sync.Mutex
	consoleCodeStore = map[string]*consoleCodeState{}
)

func generateConsoleCodeJTI() (string, error) {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func rememberIssuedConsoleCode(jti string, expiresAt int64) {
	if strings.TrimSpace(jti) == "" || expiresAt <= 0 {
		return
	}
	now := time.Now().Unix()

	consoleCodeMu.Lock()
	defer consoleCodeMu.Unlock()

	consoleCodeStore[jti] = &consoleCodeState{
		ExpiresAt: expiresAt,
		Used:      false,
	}
	// Best-effort cleanup to avoid unbounded memory growth.
	if len(consoleCodeStore) > 10000 {
		for key, state := range consoleCodeStore {
			if state == nil || state.ExpiresAt <= now || state.Used {
				delete(consoleCodeStore, key)
			}
		}
	}
}

func consumeConsoleCodeJTI(jti string) bool {
	if strings.TrimSpace(jti) == "" {
		return false
	}
	now := time.Now().Unix()

	consoleCodeMu.Lock()
	defer consoleCodeMu.Unlock()

	state, ok := consoleCodeStore[jti]
	if !ok || state == nil {
		return false
	}
	if state.Used || state.ExpiresAt <= now {
		delete(consoleCodeStore, jti)
		return false
	}
	state.Used = true
	return true
}

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

func normalizeTarget(t string) string {
	t = strings.TrimSpace(strings.ToLower(t))
	return t
}

func userDefaultTenantID(userID uint) (uint, error) {
	var tenantUser model.TenantUser
	if err := common.DB().Where("user_id = ?", userID).Order("created_at ASC").First(&tenantUser).Error; err != nil {
		return 0, err
	}
	return tenantUser.TenantID, nil
}

func userHasTenant(userID uint, tenantID uint) (bool, error) {
	if tenantID == 0 {
		return false, nil
	}

	var cnt int64
	err := common.DB().Model(&model.TenantUser{}).
		Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		Count(&cnt).Error
	if err != nil {
		return false, err
	}
	return cnt > 0, nil
}

func userHasTenantAdminAccess(userID uint, tenantID uint) (bool, error) {
	if tenantID == 0 {
		return false, nil
	}

	var cnt int64
	err := common.DB().Model(&model.TenantUser{}).
		Where("user_id = ? AND tenant_id = ? AND role IN ?", userID, tenantID, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin}).
		Count(&cnt).Error
	if err != nil {
		return false, err
	}
	return cnt > 0, nil
}

func userDefaultTenantIDForAdminConsole(userID uint) (uint, error) {
	var membership model.TenantUser
	err := common.DB().
		Where("user_id = ? AND role IN ?", userID, []model.TenantRole{model.TenantRoleOwner, model.TenantRoleAdmin}).
		Order("created_at ASC").
		First(&membership).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, errors.New("tenant admin access required")
		}
		return 0, err
	}
	if membership.TenantID == 0 {
		return 0, errors.New("tenant admin access required")
	}

	return membership.TenantID, nil
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
			ok, err := userHasTenantAdminAccess(uid, tenantID)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate tenant access"})
			}
			if !ok {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant admin access required"})
			}
		} else {
			tid, err := userDefaultTenantIDForAdminConsole(uid)
			if err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant admin access required"})
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
	}
	exp := time.Now().Add(30 * time.Second).Unix()
	jti, err := generateConsoleCodeJTI()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate code id"})
	}
	claims["exp"] = exp
	claims["jti"] = jti

	code, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(common.MustJWTSecret())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to sign code"})
	}
	rememberIssuedConsoleCode(jti, exp)

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
		return common.MustJWTSecret(), nil
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
	jti, ok := claims["jti"].(string)
	if !ok || strings.TrimSpace(jti) == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid code id"})
	}
	// Single-use enforcement: consume jti atomically to block replay in validity window.
	if !consumeConsoleCodeJTI(jti) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "code already used or expired"})
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
			tid, err := userDefaultTenantIDForAdminConsole(uid)
			if err != nil {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant admin access required"})
			}
			tenantID = tid
		}
		ok, err := userHasTenantAdminAccess(uid, tenantID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate tenant access"})
		}
		if !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "tenant admin access required"})
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
		log.Printf("[console][error] Failed to generate tokens in exchange handler: userID=%d, tenantID=%d, scope=%s, error=%v", uid, tenantID, scope, err)
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
