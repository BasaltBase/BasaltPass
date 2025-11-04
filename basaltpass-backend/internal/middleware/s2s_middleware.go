package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"strings"

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
			// 尝试从查询
			if clientID == "" {
				clientID = strings.TrimSpace(c.Query("client_id"))
			}
			if clientSecret == "" {
				clientSecret = strings.TrimSpace(c.Query("client_secret"))
			}
		}

		if clientID == "" || clientSecret == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "invalid_client",
					"message": "Missing client_id or client_secret",
				},
			})
		}

		db := common.DB()
		var client model.OAuthClient
		if err := db.Preload("App").Where("client_id = ? AND is_active = ?", clientID, true).First(&client).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "invalid_client",
					"message": "Client not found or inactive",
				},
			})
		}

		if !client.VerifyClientSecret(clientSecret) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": fiber.Map{
					"code":    "invalid_client",
					"message": "Client secret mismatch",
				},
			})
		}

		// 如果配置了 requiredScopes，则要求客户端 scopes 至少包含这些项
		if len(requiredScopes) > 0 {
			allowed := client.GetScopeList()
			for _, req := range requiredScopes {
				ok := false
				for _, have := range allowed {
					if strings.TrimSpace(have) == strings.TrimSpace(req) {
						ok = true
						break
					}
				}
				if !ok {
					return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
						"error": fiber.Map{
							"code":    "insufficient_scope",
							"message": "Client lacks required scope: " + req,
						},
					})
				}
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
