package routes

import (
	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/oauth"

	"github.com/gofiber/fiber/v2"
)

// RegisterOAuthRoutes 注册OAuth相关路由
func RegisterOAuthRoutes(app *fiber.App) {
	// OIDC Discovery端点
	app.Get("/.well-known/openid-configuration", oauth.DiscoveryHandler)

	// OIDC Discovery和会话管理端点
	app.Get("/check_session_iframe", oauth.CheckSessionIframeHandler)
	app.Get("/end_session", oauth.EndSessionHandler)

	/*
	 * OAuth2和OIDC相关端点
	 * 这些端点处理OAuth2授权、令牌颁发、用户信息
	 * 和会话管理等功能。
	 */
	oauthServerGroup := app.Group("/oauth")
	oauthServerGroup.Get("/authorize", oauth.AuthorizeHandler)
	oauthServerGroup.Post("/consent", middleware.JWTMiddleware(), oauth.ConsentHandler)
	oauthServerGroup.Post("/token", oauth.TokenHandler)
	oauthServerGroup.Get("/userinfo", oauth.UserInfoHandler)
	oauthServerGroup.Post("/introspect", oauth.IntrospectHandler)
	oauthServerGroup.Post("/revoke", oauth.RevokeHandler)
	oauthServerGroup.Get("/jwks", oauth.JWKSHandler)

	// TODO ⬇️ One-Tap Auth和Silent Auth端点
	oauthServerGroup.Post("/one-tap/login", oauth.OneTapLoginHandler)
	oauthServerGroup.Get("/silent-auth", oauth.SilentAuthHandler)
	oauthServerGroup.Get("/check-session", oauth.CheckSessionHandler)
}
