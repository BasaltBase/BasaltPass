package routes

import (
	auth2 "basaltpass-backend/internal/handler/public/auth"
	"basaltpass-backend/internal/handler/public/oauth"
	passkey2 "basaltpass-backend/internal/handler/public/passkey"
	"basaltpass-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

// RegisterOAuthRoutes 注册OAuth相关路由
func RegisterOAuthRoutes(v1 fiber.Router) {
	// OIDC Discovery端点
	v1.Get("/.well-known/openid-configuration", oauth.DiscoveryHandler)

	// OIDC Discovery和会话管理端点
	v1.Get("/check_session_iframe", oauth.CheckSessionIframeHandler)
	v1.Get("/end_session", oauth.EndSessionHandler)

	/*
	 * OAuth2和OIDC相关端点
	 * 这些端点处理OAuth2授权、令牌颁发、用户信息
	 * 和会话管理等功能。
	 */

	oauthGroup := v1.Group("/auth/oauth")
	oauthGroup.Get(":provider/login", oauth.LoginHandler)
	oauthGroup.Get(":provider/callback", oauth.CallbackHandler)

	oauthServerGroup := v1.Group("/oauth")
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

	// 认证相关路由
	authGroup := v1.Group("/auth")
	authGroup.Post("/register", auth2.RegisterHandler)
	authGroup.Post("/login", auth2.LoginHandler)
	authGroup.Post("/refresh", auth2.RefreshHandler)
	authGroup.Post("/console/authorize", middleware.JWTMiddleware(), auth2.ConsoleAuthorizeHandler)
	authGroup.Post("/console/exchange", auth2.ConsoleExchangeHandler)
	authGroup.Post("/password/reset-request", auth2.RequestResetHandler)
	authGroup.Post("/password/reset", auth2.ResetPasswordHandler)
	authGroup.Post("/verify-2fa", auth2.Verify2FAHandler)

	// Passkey authentication routes
	passkeyGroup := v1.Group("/passkey")
	passkeyGroup.Post("/register/begin", middleware.JWTMiddleware(), passkey2.BeginRegistrationHandler)
	passkeyGroup.Post("/register/finish", middleware.JWTMiddleware(), passkey2.FinishRegistrationHandler)
	passkeyGroup.Post("/login/begin", passkey2.BeginLoginHandler)
	passkeyGroup.Post("/login/finish", passkey2.FinishLoginHandler)
	passkeyGroup.Get("/list", middleware.JWTMiddleware(), passkey2.ListPasskeysHandler)
	passkeyGroup.Delete("/:id", middleware.JWTMiddleware(), passkey2.DeletePasskeyHandler)
}
