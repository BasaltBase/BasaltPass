package middleware

import (
	s2smw "basaltpass-backend/internal/middleware/s2s"

	"github.com/gofiber/fiber/v2"
)

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
	return s2smw.ClientAuthMiddleware(requiredScopes...)
}

// ClientScopeMiddleware checks S2S client scopes only.
// It expects ClientAuthMiddleware to have already authenticated the client.
func ClientScopeMiddleware(requiredScopes ...string) fiber.Handler {
	return s2smw.ClientScopeMiddleware(requiredScopes...)
}

// ClientRateLimitMiddleware applies a simple fixed-window per-client rate limit.
// Note: This is in-memory and per-process; for multi-instance deployments, use an API gateway.
func ClientRateLimitMiddleware() fiber.Handler {
	return s2smw.ClientRateLimitMiddleware()
}

// S2SAuditMiddleware logs each S2S request with client context and request_id.
func S2SAuditMiddleware() fiber.Handler {
	return s2smw.S2SAuditMiddleware()
}
