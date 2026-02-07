package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	scopesvc "basaltpass-backend/internal/service/scope"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

func s2sEnvelopeError(c *fiber.Ctx, status int, code, message string) error {
	requestID, _ := c.Locals("requestid").(string)
	return c.Status(status).JSON(fiber.Map{
		"data": nil,
		"error": fiber.Map{
			"code":    code,
			"message": message,
		},
		"request_id": requestID,
	})
}

// ClientAuthMiddleware 验证服务间调用（S2S）客户端身份。
// 支持以下凭证方式（按优先级）：
// 1) Header: client_id / client_secret
// 2) Form: client_id / client_secret（POST 表单）
// 3) Query: client_id / client_secret（不推荐，仅用于内部）
// 校验项：
// - OAuthClient 是否存在且激活
// - client_secret 验证
// - 可选：GrantTypes 包含 client_credentials（若配置）
// 认证成功后，向上下文注入：c.Locals("s2s_client_id"), c.Locals("s2s_app_id"), c.Locals("s2s_tenant_id")
func ClientAuthMiddleware(requiredScopes ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		clientID := strings.TrimSpace(c.Get("client_id"))
		clientSecret := strings.TrimSpace(c.Get("client_secret"))

		if clientID == "" || clientSecret == "" {
			// 尝试从表单
			if clientID == "" {
				clientID = strings.TrimSpace(c.FormValue("client_id"))
			}
			if clientSecret == "" {
				clientSecret = strings.TrimSpace(c.FormValue("client_secret"))
			}
		}

		if clientID == "" || clientSecret == "" {
			// 尝试从查询（可配置禁用）
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

		// 如果配置了 requiredScopes，则要求客户端 scopes 至少包含这些项
		if len(requiredScopes) > 0 {
			if !scopesvc.SatisfiesAll(clientScopes, requiredScopes) {
				return s2sEnvelopeError(c, fiber.StatusForbidden, "insufficient_scope", "Client lacks required scope")
			}
		}

		// 注入上下文，供下游处理使用
		c.Locals("s2s_client_id", client.ClientID)
		c.Locals("s2s_app_id", client.AppID)
		// 通过 App 关联的 Tenant（App 在模型中含 TenantID）
		if client.App.ID != 0 {
			c.Locals("s2s_tenant_id", client.App.TenantID)
		}

		return c.Next()
	}
}

// ClientScopeMiddleware checks S2S client scopes only.
// It expects ClientAuthMiddleware to have already authenticated the client.
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

// ClientRateLimitMiddleware applies a simple fixed-window per-client rate limit.
// Note: This is in-memory and per-process; for multi-instance deployments, use an API gateway.
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

		// Best-effort cleanup to avoid unbounded growth.
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

// S2SAuditMiddleware logs each S2S request with client context and request_id.
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
			// Global error handler may still run, but we keep status for signal.
			status = fiber.StatusInternalServerError
		}
		requestID, _ := c.Locals("requestid").(string)
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
