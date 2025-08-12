package oauth

import (
	"basaltpass-backend/internal/handler/public/aduit"
	"net/http"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var oauthServerService = NewOAuthServerService()

// AuthorizeHandler 处理OAuth2授权请求
// GET /oauth/authorize
func AuthorizeHandler(c *fiber.Ctx) error {
	// 解析授权请求参数
	req := &AuthorizeRequest{
		ClientID:            c.Query("client_id"),
		RedirectURI:         c.Query("redirect_uri"),
		ResponseType:        c.Query("response_type"),
		Scope:               c.Query("scope"),
		State:               c.Query("state"),
		CodeChallenge:       c.Query("code_challenge"),
		CodeChallengeMethod: c.Query("code_challenge_method"),
	}

	// 验证授权请求
	client, err := oauthServerService.ValidateAuthorizeRequest(req)
	if err != nil {
		return redirectWithError(c, req.RedirectURI, err.Error(), req.State)
	}

	// 检查用户是否已登录
	userID := c.Locals("userID")
	if userID == nil {
		// 用户未登录，重定向到登录页面
		loginURL := buildLoginURL(c, req)
		return c.Redirect(loginURL, http.StatusFound)
	}

	// 用户已登录，显示授权同意页面
	return c.Render("oauth_consent", fiber.Map{
		"client":       client,
		"scopes":       strings.Split(req.Scope, " "),
		"redirect_uri": req.RedirectURI,
		"state":        req.State,
		"client_id":    req.ClientID,
	})
}

// ConsentHandler 处理用户授权同意
// POST /oauth/consent
func ConsentHandler(c *fiber.Ctx) error {
	// 检查用户是否已登录
	userIDVal := c.Locals("userID")
	if userIDVal == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID := userIDVal.(uint)

	// 解析表单数据
	clientID := c.FormValue("client_id")
	redirectURI := c.FormValue("redirect_uri")
	state := c.FormValue("state")
	scope := c.FormValue("scope")
	action := c.FormValue("action") // "allow" 或 "deny"

	if action != "allow" {
		// 用户拒绝授权
		return redirectWithError(c, redirectURI, "access_denied", state)
	}

	// 构建授权请求
	req := &AuthorizeRequest{
		ClientID:     clientID,
		RedirectURI:  redirectURI,
		ResponseType: "code",
		Scope:        scope,
		State:        state,
	}

	// 验证请求
	_, err := oauthServerService.ValidateAuthorizeRequest(req)
	if err != nil {
		return redirectWithError(c, redirectURI, err.Error(), state)
	}

	// 生成授权码
	code, err := oauthServerService.GenerateAuthorizationCode(userID, req)
	if err != nil {
		return redirectWithError(c, redirectURI, "server_error", state)
	}

	// 记录审计日志
	aduit.LogAudit(userID, "OAuth2授权", "oauth_client", clientID, c.IP(), c.Get("User-Agent"))

	// 重定向回客户端
	return redirectWithCode(c, redirectURI, code, state)
}

// TokenHandler 处理OAuth2令牌请求
// POST /oauth/token
func TokenHandler(c *fiber.Ctx) error {
	grantType := c.FormValue("grant_type")

	switch grantType {
	case "authorization_code":
		return handleAuthorizationCodeGrant(c)
	case "refresh_token":
		return handleRefreshTokenGrant(c)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             "unsupported_grant_type",
			"error_description": "Grant type not supported",
		})
	}
}

// handleAuthorizationCodeGrant 处理授权码授权
func handleAuthorizationCodeGrant(c *fiber.Ctx) error {
	// 解析令牌请求
	req := &TokenRequest{
		GrantType:    c.FormValue("grant_type"),
		Code:         c.FormValue("code"),
		RedirectURI:  c.FormValue("redirect_uri"),
		ClientID:     c.FormValue("client_id"),
		CodeVerifier: c.FormValue("code_verifier"),
	}

	// 获取客户端认证信息（Basic Auth或表单参数）
	clientID, clientSecret := extractClientCredentials(c)
	if clientID == "" {
		clientID = req.ClientID
	}

	if clientID == "" || clientSecret == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             "invalid_client",
			"error_description": "Client authentication failed",
		})
	}

	// 交换令牌
	tokenResponse, err := oauthServerService.ExchangeCodeForToken(req, clientSecret)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             err.Error(),
			"error_description": "Authorization code exchange failed",
		})
	}

	return c.JSON(tokenResponse)
}

// handleRefreshTokenGrant 处理刷新令牌授权
func handleRefreshTokenGrant(c *fiber.Ctx) error {
	refreshToken := c.FormValue("refresh_token")

	// 获取客户端认证信息
	clientID, clientSecret := extractClientCredentials(c)
	if clientID == "" || clientSecret == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             "invalid_client",
			"error_description": "Client authentication failed",
		})
	}

	// 刷新令牌
	tokenResponse, err := oauthServerService.RefreshAccessToken(refreshToken, clientID, clientSecret)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             err.Error(),
			"error_description": "Refresh token failed",
		})
	}

	return c.JSON(tokenResponse)
}

// UserInfoHandler 处理用户信息请求（OpenID Connect）
// GET /oauth/userinfo
func UserInfoHandler(c *fiber.Ctx) error {
	// 从Authorization头获取访问令牌
	authHeader := c.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             "invalid_token",
			"error_description": "Missing or invalid access token",
		})
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")

	// 获取用户信息
	userInfo, err := oauthServerService.GetUserInfo(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             err.Error(),
			"error_description": "Failed to get user info",
		})
	}

	return c.JSON(userInfo)
}

// IntrospectHandler 令牌内省端点
// POST /oauth/introspect
func IntrospectHandler(c *fiber.Ctx) error {
	token := c.FormValue("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid_request",
		})
	}

	// 验证令牌
	oauthToken, err := oauthServerService.ValidateAccessToken(token)
	if err != nil {
		return c.JSON(fiber.Map{
			"active": false,
		})
	}

	// 返回令牌信息
	return c.JSON(fiber.Map{
		"active":    true,
		"client_id": oauthToken.ClientID,
		"username":  oauthToken.User.Email,
		"scope":     oauthToken.Scopes,
		"exp":       oauthToken.ExpiresAt.Unix(),
		"iat":       oauthToken.CreatedAt.Unix(),
		"sub":       oauthToken.UserID,
	})
}

// RevokeHandler 令牌撤销端点
// POST /oauth/revoke
func RevokeHandler(c *fiber.Ctx) error {
	token := c.FormValue("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid_request",
		})
	}

	// 撤销令牌
	err := oauthServerService.RevokeToken(token)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "server_error",
		})
	}

	return c.SendStatus(fiber.StatusOK)
}

// 辅助函数

// buildLoginURL 构建登录URL，包含OAuth2参数
func buildLoginURL(c *fiber.Ctx, req *AuthorizeRequest) string {
	loginURL := "/login"

	// 构建原始OAuth2授权URL作为重定向参数
	originalURL := "/api/v1/oauth/authorize?" + c.Context().QueryArgs().String()

	return loginURL + "?redirect=" + url.QueryEscape(originalURL)
}

// redirectWithError 带错误信息重定向
func redirectWithError(c *fiber.Ctx, redirectURI, errorCode, state string) error {
	u, err := url.Parse(redirectURI)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_redirect_uri"})
	}

	q := u.Query()
	q.Set("error", errorCode)
	if state != "" {
		q.Set("state", state)
	}

	u.RawQuery = q.Encode()
	return c.Redirect(u.String(), http.StatusFound)
}

// redirectWithCode 带授权码重定向
func redirectWithCode(c *fiber.Ctx, redirectURI, code, state string) error {
	u, err := url.Parse(redirectURI)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid_redirect_uri"})
	}

	q := u.Query()
	q.Set("code", code)
	if state != "" {
		q.Set("state", state)
	}

	u.RawQuery = q.Encode()
	return c.Redirect(u.String(), http.StatusFound)
}

// extractClientCredentials 提取客户端凭证（支持Basic Auth和表单参数）
func extractClientCredentials(c *fiber.Ctx) (clientID, clientSecret string) {
	// 尝试从Basic Auth获取
	clientID = c.Get("client_id")
	clientSecret = c.Get("client_secret")

	if clientID != "" && clientSecret != "" {
		return clientID, clientSecret
	}

	// 尝试从表单参数获取
	clientID = c.FormValue("client_id")
	clientSecret = c.FormValue("client_secret")

	return clientID, clientSecret
}
