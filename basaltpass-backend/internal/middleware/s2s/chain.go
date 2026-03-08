package s2s

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/middleware/transport"
	"basaltpass-backend/internal/model"
	scopesvc "basaltpass-backend/internal/service/scope"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

func s2sEnvelopeError(c *fiber.Ctx, status int, code, message string) error {
	return transport.S2SErrorResponse(c, status, code, message)
}

func ClientAuthMiddleware(requiredScopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		clientID := strings.TrimSpace(c.Get("client_id"))
		clientSecret := strings.TrimSpace(c.Get("client_secret"))

		if clientID == "" || clientSecret == "" {
			if clientID == "" {
				clientID = strings.TrimSpace(c.FormValue("client_id"))
			}
			if clientSecret == "" {
				clientSecret = strings.TrimSpace(c.FormValue("client_secret"))
			}
		}

		if clientID == "" || clientSecret == "" {
			if config.Get().S2S.AllowQueryCredentials {
				if clientID == "" {
					clientID = strings.TrimSpace(c.Query("client_id"))
				}
				if clientSecret == "" {
					clientSecret = strings.TrimSpace(c.Query("client_secret"))
				}
			}
		}

		if clientID == "" || clientSecret == "" {
			return s2sEnvelopeError(c, fiber.StatusUnauthorized, "invalid_client", "Missing client_id or client_secret")
		}

		db := common.DB()
		var client model.OAuthClient
		if err := db.Preload("App").Where("client_id = ? AND is_active = ?", clientID, true).First(&client).Error; err != nil {
			return s2sEnvelopeError(c, fiber.StatusUnauthorized, "invalid_client", "Client not found or inactive")
		}

		if !client.VerifyClientSecret(clientSecret) {
			return s2sEnvelopeError(c, fiber.StatusUnauthorized, "invalid_client", "Client secret mismatch")
		}

		clientScopes := client.GetScopeList()
		c.Locals("s2s_scopes", clientScopes)

		if len(requiredScopes) > 0 {
			if !scopesvc.SatisfiesAll(clientScopes, requiredScopes) {
				return s2sEnvelopeError(c, fiber.StatusForbidden, "insufficient_scope", "Client lacks required scope")
			}
		}

		c.Locals("s2s_client_id", client.ClientID)
		c.Locals("s2s_app_id", client.AppID)
		if client.App.ID != 0 {
			c.Locals("s2s_tenant_id", client.App.TenantID)
		}

		return c.Next()
	}
}

func ClientScopeMiddleware(requiredScopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if len(requiredScopes) == 0 {
			return c.Next()
		}
		scopesAny := c.Locals("s2s_scopes")
		scopesList, _ := scopesAny.([]string)
		if !scopesvc.SatisfiesAll(scopesList, requiredScopes) {
			return s2sEnvelopeError(c, fiber.StatusForbidden, "insufficient_scope", "Client lacks required scope")
		}
		return c.Next()
	}
}

type rateLimitCounter struct {
	window   int64
	count    int
	lastSeen time.Time
}

var (
	rlMu   sync.Mutex
	rlByID = map[string]*rateLimitCounter{}
)

func ClientRateLimitMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		cfg := config.Get().S2S
		if !cfg.RateLimit.Enabled {
			return c.Next()
		}
		rpm := cfg.RateLimit.RequestsPerMinute
		if rpm <= 0 {
			rpm = 600
		}

		clientID, _ := c.Locals("s2s_client_id").(string)
		key := strings.TrimSpace(clientID)
		if key == "" {
			key = c.IP()
		}

		now := time.Now()
		w := now.Unix() / 60

		rlMu.Lock()
		ctr := rlByID[key]
		if ctr == nil {
			ctr = &rateLimitCounter{window: w, count: 0, lastSeen: now}
			rlByID[key] = ctr
		}
		if ctr.window != w {
			ctr.window = w
			ctr.count = 0
		}
		ctr.count++
		ctr.lastSeen = now
		shouldLimit := ctr.count > rpm

		if len(rlByID) > 5000 {
			cutoff := now.Add(-10 * time.Minute)
			for k, v := range rlByID {
				if v.lastSeen.Before(cutoff) {
					delete(rlByID, k)
				}
			}
		}
		rlMu.Unlock()

		if shouldLimit {
			return s2sEnvelopeError(c, fiber.StatusTooManyRequests, "rate_limited", "Rate limit exceeded")
		}
		return c.Next()
	}
}

func S2SAuditMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !config.Get().S2S.AuditEnabled {
			return c.Next()
		}
		start := time.Now()
		err := c.Next()
		durationMs := time.Since(start).Milliseconds()
		status := c.Response().StatusCode()
		if err != nil {
			status = fiber.StatusInternalServerError
		}
		requestID := transport.RequestIDFromCtx(c)
		clientID, _ := c.Locals("s2s_client_id").(string)
		appID := c.Locals("s2s_app_id")
		tenantID := c.Locals("s2s_tenant_id")
		log.Printf(
			"s2s_audit request_id=%s client_id=%s app_id=%v tenant_id=%v method=%s path=%s status=%d duration_ms=%d ip=%s",
			requestID,
			clientID,
			appID,
			tenantID,
			c.Method(),
			c.Path(),
			status,
			durationMs,
			c.IP(),
		)
		return err
	}
}
