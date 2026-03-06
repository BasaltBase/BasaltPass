package oauth

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/url"
	"strconv"
	"strings"
	"time"

	"basaltpass-backend/internal/common"
	security "basaltpass-backend/internal/handler/user/security"
	"basaltpass-backend/internal/model"
	auth "basaltpass-backend/internal/service/auth"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// OneTapAuthRequest One-Tap认证请求
type OneTapAuthRequest struct {
	ClientID     string `json:"client_id" validate:"required"`
	Scope        string `json:"scope,omitempty"`
	State        string `json:"state,omitempty"`
	RedirectURI  string `json:"redirect_uri,omitempty"`
	ResponseType string `json:"response_type,omitempty"` // must be "code" when provided
}

// OneTapAuthResponse One-Tap认证响应
type OneTapAuthResponse struct {
	Success   bool   `json:"success"`
	Code      string `json:"code,omitempty"`
	State     string `json:"state,omitempty"`
	Error     string `json:"error,omitempty"`
	ErrorDesc string `json:"error_description,omitempty"`
}

// SilentAuthRequest 静默认证请求
type SilentAuthRequest struct {
	ClientID    string `json:"client_id" validate:"required"`
	Scope       string `json:"scope,omitempty"`
	Nonce       string `json:"nonce,omitempty"`
	State       string `json:"state,omitempty"`
	RedirectURI string `json:"redirect_uri,omitempty"`
	Prompt      string `json:"prompt,omitempty"` // "none" for silent auth
}

// OneTapLoginHandler One-Tap登录端点
// POST /oauth/one-tap/login
func OneTapLoginHandler(c *fiber.Ctx) error {
	var req OneTapAuthRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(OneTapAuthResponse{
			Success:   false,
			Error:     "invalid_request",
			ErrorDesc: "Invalid request format",
		})
	}

	client, err := validateOAuthClient(req.ClientID, req.RedirectURI)
	if err != nil {
		return handleOneTapError(c, err, req.State)
	}
	if strings.TrimSpace(req.ResponseType) != "" && strings.TrimSpace(req.ResponseType) != "code" {
		return c.Status(fiber.StatusBadRequest).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "unsupported_response_type",
			ErrorDesc: "One-Tap only supports response_type=code",
		})
	}

	user, err := getUserFromSession(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "login_required",
			ErrorDesc: "User not authenticated",
		})
	}

	scope := normalizeRequestedScope(req.Scope, client)
	authReq := &AuthorizeRequest{
		ClientID:     req.ClientID,
		RedirectURI:  req.RedirectURI,
		ResponseType: "code",
		Scope:        scope,
		State:        req.State,
	}
	validatedClient, err := oauthServerService.ValidateAuthorizeRequest(authReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "invalid_request",
			ErrorDesc: err.Error(),
		})
	}
	if err := oauthServerService.ValidateUserTenant(user.ID, validatedClient); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "access_denied",
			ErrorDesc: "User does not belong to this tenant",
		})
	}
	if err := ensurePriorAppAuthorization(user.ID, validatedClient, scope); err != nil {
		return c.Status(fiber.StatusForbidden).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "interaction_required",
			ErrorDesc: err.Error(),
		})
	}

	code, err := oauthServerService.GenerateAuthorizationCode(user.ID, authReq, validatedClient)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "server_error",
			ErrorDesc: "Failed to generate authorization code",
		})
	}

	// 记录登录成功
	if err := security.RecordLoginSuccess(user.ID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}

	return c.JSON(OneTapAuthResponse{
		Success: true,
		Code:    code,
		State:   req.State,
	})
}

// SilentAuthHandler 静默认证端点
// GET /oauth/silent-auth
func SilentAuthHandler(c *fiber.Ctx) error {
	clientID := c.Query("client_id")
	prompt := c.Query("prompt")
	redirectURI := c.Query("redirect_uri")
	state := c.Query("state")
	scope := c.Query("scope")

	if prompt != "none" {
		return renderSilentAuthError(c, fiber.StatusBadRequest, redirectURI, state, "invalid_request")
	}

	client, err := validateOAuthClient(clientID, redirectURI)
	if err != nil {
		if oe, ok := err.(*oauthError); ok {
			return renderSilentAuthError(c, oe.status, redirectURI, state, oe.code)
		}
		return renderSilentAuthError(c, fiber.StatusInternalServerError, redirectURI, state, "server_error")
	}

	user, err := getUserFromSession(c)
	if err != nil {
		return renderSilentAuthError(c, fiber.StatusUnauthorized, redirectURI, state, "login_required")
	}
	if err := oauthServerService.ValidateUserTenant(user.ID, client); err != nil {
		return renderSilentAuthError(c, fiber.StatusForbidden, redirectURI, state, "access_denied")
	}
	authReq := &AuthorizeRequest{
		ClientID:     clientID,
		RedirectURI:  redirectURI,
		ResponseType: "code",
		Scope:        normalizeRequestedScope(scope, client),
		State:        state,
	}
	validatedClient, err := oauthServerService.ValidateAuthorizeRequest(authReq)
	if err != nil {
		return renderSilentAuthError(c, fiber.StatusBadRequest, redirectURI, state, "invalid_request")
	}
	if err := oauthServerService.ValidateUserTenant(user.ID, validatedClient); err != nil {
		return renderSilentAuthError(c, fiber.StatusForbidden, redirectURI, state, "access_denied")
	}
	if err := ensurePriorAppAuthorization(user.ID, validatedClient, authReq.Scope); err != nil {
		return renderSilentAuthError(c, fiber.StatusForbidden, redirectURI, state, "interaction_required")
	}
	code, err := oauthServerService.GenerateAuthorizationCode(user.ID, authReq, validatedClient)
	if err != nil {
		return renderSilentAuthError(c, fiber.StatusInternalServerError, redirectURI, state, "server_error")
	}

	// 记录登录成功
	if err := security.RecordLoginSuccess(user.ID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}

	return renderSilentAuthSuccess(c, redirectURI, state, code)
}

// CheckSessionHandler 检查会话状态
// GET /oauth/check-session
func CheckSessionHandler(c *fiber.Ctx) error {
	clientID := strings.TrimSpace(c.Query("client_id"))
	redirectURI := strings.TrimSpace(c.Query("redirect_uri"))
	scope := strings.TrimSpace(c.Query("scope"))

	user, err := getUserFromSession(c)
	if err != nil {
		return c.JSON(fiber.Map{
			"authenticated":     false,
			"one_tap_available": false,
			"reason":            "login_required",
			"user_id":           nil,
			"session_time":      time.Now().Unix(),
		})
	}

	if clientID == "" {
		return c.JSON(fiber.Map{
			"authenticated":     true,
			"one_tap_available": true,
			"user_id":           user.ID,
			"session_time":      time.Now().Unix(),
		})
	}

	client, err := validateOAuthClient(clientID, redirectURI)
	if err != nil {
		if oe, ok := err.(*oauthError); ok {
			return c.Status(oe.status).JSON(fiber.Map{
				"authenticated":     true,
				"one_tap_available": false,
				"reason":            oe.code,
				"user_id":           user.ID,
				"session_time":      time.Now().Unix(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"authenticated":     true,
			"one_tap_available": false,
			"reason":            "server_error",
			"user_id":           user.ID,
			"session_time":      time.Now().Unix(),
		})
	}

	if err := oauthServerService.ValidateUserTenant(user.ID, client); err != nil {
		return c.JSON(fiber.Map{
			"authenticated":     true,
			"one_tap_available": false,
			"reason":            "tenant_mismatch",
			"user_id":           user.ID,
			"session_time":      time.Now().Unix(),
		})
	}
	if err := ensurePriorAppAuthorization(user.ID, client, normalizeRequestedScope(scope, client)); err != nil {
		return c.JSON(fiber.Map{
			"authenticated":     true,
			"one_tap_available": false,
			"reason":            "interaction_required",
			"user_id":           user.ID,
			"session_time":      time.Now().Unix(),
		})
	}

	return c.JSON(fiber.Map{
		"authenticated":     true,
		"one_tap_available": true,
		"user_id":           user.ID,
		"session_time":      time.Now().Unix(),
	})
}

// getUserFromSession 从会话中获取用户
func getUserFromSession(c *fiber.Ctx) (*model.User, error) {
	if userVal := c.Locals("userID"); userVal != nil {
		switch v := userVal.(type) {
		case uint:
			return loadActiveUser(v)
		case int:
			return loadActiveUser(uint(v))
		case string:
			if parsed, err := strconv.ParseUint(v, 10, 64); err == nil {
				return loadActiveUser(uint(parsed))
			}
		}
	}

	tokenString := extractTokenFromRequest(c)
	if tokenString == "" {
		return nil, errors.New("no session token found")
	}

	token, err := auth.ParseToken(tokenString)
	if err != nil || token == nil || !token.Valid {
		return nil, errors.New("invalid session token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid session claims")
	}

	rawSub, ok := claims["sub"]
	if !ok {
		return nil, errors.New("missing subject claim")
	}

	var userID uint
	switch v := rawSub.(type) {
	case float64:
		userID = uint(v)
	case json.Number:
		if parsed, parseErr := v.Int64(); parseErr == nil {
			userID = uint(parsed)
		}
	case string:
		if parsed, parseErr := strconv.ParseUint(v, 10, 64); parseErr == nil {
			userID = uint(parsed)
		}
	default:
		return nil, errors.New("unsupported subject claim type")
	}

	if userID == 0 {
		return nil, errors.New("invalid subject claim")
	}

	return loadActiveUser(userID)
}

// renderSilentAuthSuccess 渲染静默认证成功页面
func renderSilentAuthSuccess(c *fiber.Ctx, redirectURI, state, code string) error {
	codeJSON := jsonStringLiteral(code)
	stateJSON := jsonStringLiteral(state)
	redirectURIJSON := jsonStringLiteral(redirectURI)
	targetOrigin, err := resolveOriginFromRedirectURI(redirectURI)
	if err != nil {
		return renderSilentAuthError(c, fiber.StatusBadRequest, redirectURI, state, "invalid_request")
	}
	targetOriginJSON := jsonStringLiteral(targetOrigin)

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>BasaltPass Silent Auth</title>
</head>
<body>
    <script>
        // 向父窗口发送认证结果
        const result = {
            success: true,
            code: %s,
            state: %s
        };

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(result, %s);
        }

        // 如果有redirect_uri，重定向携带授权码
        const redirectUri = %s;
        if (redirectUri) {
            const u = new URL(redirectUri);
            u.searchParams.set('code', result.code);
            if (result.state) {
                u.searchParams.set('state', result.state);
            }
            window.location.replace(u.toString());
        }
    </script>
</body>
</html>
        `, codeJSON, stateJSON, targetOriginJSON, redirectURIJSON)

	c.Set("Content-Type", "text/html")
	return c.SendString(html)
}

// renderSilentAuthError 渲染静默认证错误页面
func renderSilentAuthError(c *fiber.Ctx, status int, redirectURI, state, errorCode string) error {
	errorCodeJSON := jsonStringLiteral(errorCode)
	stateJSON := jsonStringLiteral(state)
	redirectURIJSON := jsonStringLiteral(redirectURI)
	targetOrigin := ""
	if origin, err := resolveOriginFromRedirectURI(redirectURI); err == nil {
		targetOrigin = origin
	}
	targetOriginJSON := jsonStringLiteral(targetOrigin)

	html := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <title>BasaltPass Silent Auth Error</title>
</head>
<body>
    <script>
        // 向父窗口发送错误结果
        const result = {
            success: false,
            error: %s,
            state: %s
        };

        if (window.parent && window.parent !== window) {
            if (%s) {
                window.parent.postMessage(result, %s);
            }
        }

        // 如果有redirect_uri，重定向到错误页面（query）
        const redirectUri = %s;
        if (redirectUri) {
            const u = new URL(redirectUri);
            u.searchParams.set('error', result.error);
            if (result.state) {
                u.searchParams.set('state', result.state);
            }
            window.location.replace(u.toString());
        }
    </script>
</body>
</html>
        `, errorCodeJSON, stateJSON, targetOriginJSON, targetOriginJSON, redirectURIJSON)

	c.Set("Content-Type", "text/html")
	c.Status(status)
	return c.SendString(html)
}

func validateOAuthClient(clientID, redirectURI string) (*model.OAuthClient, error) {
	if strings.TrimSpace(clientID) == "" {
		return nil, &oauthError{status: fiber.StatusBadRequest, code: "invalid_request", description: "Missing client_id"}
	}
	if strings.TrimSpace(redirectURI) == "" {
		return nil, &oauthError{status: fiber.StatusBadRequest, code: "invalid_request", description: "Missing redirect_uri"}
	}

	var client model.OAuthClient
	if err := common.DB().Where("client_id = ?", clientID).First(&client).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, &oauthError{status: fiber.StatusUnauthorized, code: "invalid_client", description: "OAuth client not found"}
		}
		return nil, err
	}

	if !client.IsActive {
		return nil, &oauthError{status: fiber.StatusUnauthorized, code: "invalid_client", description: "OAuth client disabled"}
	}

	if !client.ValidateRedirectURI(redirectURI) {
		return nil, &oauthError{status: fiber.StatusBadRequest, code: "invalid_request", description: "redirect_uri not registered"}
	}

	return &client, nil
}

func handleOneTapError(c *fiber.Ctx, err error, state string) error {
	if oe, ok := err.(*oauthError); ok {
		return c.Status(oe.status).JSON(OneTapAuthResponse{
			Success:   false,
			State:     state,
			Error:     oe.code,
			ErrorDesc: oe.description,
		})
	}
	return c.Status(fiber.StatusInternalServerError).JSON(OneTapAuthResponse{
		Success:   false,
		State:     state,
		Error:     "server_error",
		ErrorDesc: "Internal server error",
	})
}

type oauthError struct {
	status      int
	code        string
	description string
}

func (e *oauthError) Error() string {
	return e.description
}

func normalizeRequestedScope(raw string, client *model.OAuthClient) string {
	scope := strings.TrimSpace(raw)
	if scope != "" {
		return scope
	}
	if client == nil {
		return ""
	}
	return strings.Join(client.GetScopeList(), " ")
}

func ensurePriorAppAuthorization(userID uint, client *model.OAuthClient, requestedScope string) error {
	if client == nil {
		return errors.New("invalid client")
	}
	if client.AppID == 0 {
		return errors.New("interaction required")
	}

	var appUser model.AppUser
	err := common.DB().
		Where("app_id = ? AND user_id = ?", client.AppID, userID).
		First(&appUser).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("user consent required")
		}
		return err
	}
	if appUser.Status != model.AppUserStatusActive {
		return errors.New("application access not active")
	}

	requested := parseScopeList(requestedScope)
	granted := parseScopeList(appUser.Scopes)
	if len(requested) > 0 && !scopeSetContainsAll(granted, requested) {
		return errors.New("requested scope requires consent")
	}
	return nil
}

func parseScopeList(scope string) []string {
	normalized := strings.TrimSpace(strings.ReplaceAll(scope, ",", " "))
	if normalized == "" {
		return nil
	}
	parts := strings.Fields(normalized)
	out := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for _, part := range parts {
		p := strings.TrimSpace(part)
		if p == "" {
			continue
		}
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	return out
}

func scopeSetContainsAll(granted, requested []string) bool {
	if len(requested) == 0 {
		return true
	}
	set := map[string]struct{}{}
	for _, s := range granted {
		set[s] = struct{}{}
	}
	for _, s := range requested {
		if _, ok := set[s]; !ok {
			return false
		}
	}
	return true
}

func resolveOriginFromRedirectURI(redirectURI string) (string, error) {
	u, err := url.Parse(strings.TrimSpace(redirectURI))
	if err != nil {
		return "", err
	}
	if u.Scheme == "" || u.Host == "" {
		return "", errors.New("invalid redirect_uri")
	}
	return u.Scheme + "://" + u.Host, nil
}

func jsonStringLiteral(v string) string {
	encoded, err := json.Marshal(v)
	if err != nil {
		return `""`
	}
	return string(encoded)
}

func extractTokenFromRequest(c *fiber.Ctx) string {
	if authHeader := c.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	for _, cookieName := range []string{
		"access_token",
		"access_token_user",
		"access_token_tenant",
		"access_token_admin",
	} {
		if token := c.Cookies(cookieName); token != "" {
			return token
		}
	}
	if cookie := c.Cookies("Authorization"); strings.HasPrefix(cookie, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(cookie, "Bearer "))
	}
	if cookie := c.Cookies("token"); cookie != "" {
		return cookie
	}
	return ""
}

func loadActiveUser(userID uint) (*model.User, error) {
	if userID == 0 {
		return nil, errors.New("invalid user id")
	}

	var user model.User
	if err := common.DB().First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	if user.Banned {
		return nil, errors.New("user banned")
	}

	return &user, nil
}
