package routes

import (
	"basaltpass-backend/internal/middleware"
	oauth2 "basaltpass-backend/internal/public/oauth"

	"github.com/gofiber/fiber/v2"
)

// RegisterOAuthRoutes 注册OAuth相关路由
func RegisterOAuthRoutes(app *fiber.App) {
	// OIDC Discovery端点
	app.Get("/.well-known/openid-configuration", oauth2.DiscoveryHandler)

	// OIDC Discovery和会话管理端点
	app.Get("/check_session_iframe", oauth2.CheckSessionIframeHandler)
	app.Get("/end_session", oauth2.EndSessionHandler)

	/*
	 * OAuth2和OIDC相关端点
	 * 这些端点处理OAuth2授权、令牌颁发、用户信息
	 * 和会话管理等功能。
	 */
	oauthServerGroup := app.Group("/oauth")
	oauthServerGroup.Get("/authorize", oauth2.AuthorizeHandler)
	oauthServerGroup.Post("/consent", middleware.JWTMiddleware(), oauth2.ConsentHandler)
	oauthServerGroup.Post("/token", oauth2.TokenHandler)
	oauthServerGroup.Get("/userinfo", oauth2.UserInfoHandler)
	oauthServerGroup.Post("/introspect", oauth2.IntrospectHandler)
	oauthServerGroup.Post("/revoke", oauth2.RevokeHandler)
	oauthServerGroup.Get("/jwks", oauth2.JWKSHandler)

	// TODO ⬇️ One-Tap Auth和Silent Auth端点
	oauthServerGroup.Post("/one-tap/login", oauth2.OneTapLoginHandler)
	oauthServerGroup.Get("/silent-auth", oauth2.SilentAuthHandler)
	oauthServerGroup.Get("/check-session", oauth2.CheckSessionHandler)
}
