package routes

import (
	"basaltpass-backend/internal/middleware"
	auth2 "basaltpass-backend/internal/public/auth"
	oauth2 "basaltpass-backend/internal/public/oauth"
	passkey2 "basaltpass-backend/internal/public/passkey"

	"github.com/gofiber/fiber/v2"
)

// RegisterOAuthRoutes 注册OAuth相关路由
func RegisterOAuthRoutes(v1 fiber.Router) {
	// OIDC Discovery端点
	v1.Get("/.well-known/openid-configuration", oauth2.DiscoveryHandler)

	// OIDC Discovery和会话管理端点
	v1.Get("/check_session_iframe", oauth2.CheckSessionIframeHandler)
	v1.Get("/end_session", oauth2.EndSessionHandler)

	/*
	 * OAuth2和OIDC相关端点
	 * 这些端点处理OAuth2授权、令牌颁发、用户信息
	 * 和会话管理等功能。
	 */

	oauthGroup := v1.Group("/auth/oauth")
	oauthGroup.Get(":provider/login", oauth2.LoginHandler)
	oauthGroup.Get(":provider/callback", oauth2.CallbackHandler)

	oauthServerGroup := v1.Group("/oauth")
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

	// 认证相关路由
	authGroup := v1.Group("/auth")
	authGroup.Post("/register", auth2.RegisterHandler)
	authGroup.Post("/login", auth2.LoginHandler)
	authGroup.Post("/refresh", auth2.RefreshHandler)
	authGroup.Post("/password/reset-request", auth2.RequestResetHandler)
	authGroup.Post("/password/reset", auth2.ResetPasswordHandler)
	authGroup.Post("/verify-2fa", auth2.Verify2FAHandler)
	authGroup.Get("/debug/cookies", auth2.DebugCookiesHandler) // 调试端点

	// Passkey authentication routes
	passkeyGroup := v1.Group("/passkey")
	passkeyGroup.Post("/register/begin", middleware.JWTMiddleware(), passkey2.BeginRegistrationHandler)
	passkeyGroup.Post("/register/finish", middleware.JWTMiddleware(), passkey2.FinishRegistrationHandler)
	passkeyGroup.Post("/login/begin", passkey2.BeginLoginHandler)
	passkeyGroup.Post("/login/finish", passkey2.FinishLoginHandler)
	passkeyGroup.Get("/list", middleware.JWTMiddleware(), passkey2.ListPasskeysHandler)
	passkeyGroup.Delete("/:id", middleware.JWTMiddleware(), passkey2.DeletePasskeyHandler)
}
