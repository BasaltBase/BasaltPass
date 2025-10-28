package oauth

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// OneTapAuthRequest One-Tap认证请求
type OneTapAuthRequest struct {
	ClientID     string `json:"client_id" validate:"required"`
	Nonce        string `json:"nonce,omitempty"`
	State        string `json:"state,omitempty"`
	RedirectURI  string `json:"redirect_uri,omitempty"`
	ResponseType string `json:"response_type,omitempty"` // 默认 "id_token"
}

// OneTapAuthResponse One-Tap认证响应
type OneTapAuthResponse struct {
	Success   bool   `json:"success"`
	IDToken   string `json:"id_token,omitempty"`
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

	user, err := getUserFromSession(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "login_required",
			ErrorDesc: "User not authenticated",
		})
	}

	idToken, err := generateIDToken(c, user, client, req.Nonce)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(OneTapAuthResponse{
			Success:   false,
			State:     req.State,
			Error:     "server_error",
			ErrorDesc: "Failed to generate ID token",
		})
	}

	return c.JSON(OneTapAuthResponse{
		Success: true,
		IDToken: idToken,
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
	nonce := c.Query("nonce")

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

	idToken, err := generateIDToken(c, user, client, nonce)
	if err != nil {
		return renderSilentAuthError(c, fiber.StatusInternalServerError, redirectURI, state, "server_error")
	}

	return renderSilentAuthSuccess(c, redirectURI, state, idToken)
}

// CheckSessionHandler 检查会话状态
// GET /oauth/check-session
func CheckSessionHandler(c *fiber.Ctx) error {
	user, err := getUserFromSession(c)
	if err != nil {
		return c.JSON(fiber.Map{
			"authenticated": false,
			"user_id":       nil,
			"session_time":  time.Now().Unix(),
		})
	}

	return c.JSON(fiber.Map{
		"authenticated": true,
		"user_id":       user.ID,
		"session_time":  time.Now().Unix(),
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

// generateIDToken 生成ID Token
func generateIDToken(c *fiber.Ctx, user *model.User, client *model.OAuthClient, nonce string) (string, error) {
	now := time.Now()
	issuer := fmt.Sprintf("%s://%s", c.Protocol(), c.Hostname())

	claims := jwt.MapClaims{
		"iss":                issuer,
		"sub":                fmt.Sprintf("%d", user.ID),
		"aud":                client.ClientID,
		"azp":                client.ClientID,
		"exp":                now.Add(time.Hour).Unix(),
		"iat":                now.Unix(),
		"auth_time":          now.Unix(),
		"preferred_username": preferredUsername(user),
	}

	if nonce != "" {
		claims["nonce"] = nonce
	}
	if user.Email != "" {
		claims["email"] = user.Email
		claims["email_verified"] = user.EmailVerified
	}
	if user.Nickname != "" {
		claims["name"] = user.Nickname
	}

	privateKey, err := GetPrivateKey()
	if err != nil {
		return "", err
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = GetKeyID()

	return token.SignedString(privateKey)
}

// renderSilentAuthSuccess 渲染静默认证成功页面
func renderSilentAuthSuccess(c *fiber.Ctx, redirectURI, state, idToken string) error {
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
            id_token: '%s',
            state: '%s'
        };

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(result, '*');
        }

        // 如果有redirect_uri，也可以重定向
        const redirectUri = '%s';
        if (redirectUri) {
            const params = new URLSearchParams({
                id_token: result.id_token,
                state: result.state || ''
            });
            window.location.href = redirectUri + '#' + params.toString();
        }
    </script>
</body>
</html>
        `, idToken, state, redirectURI)

	c.Set("Content-Type", "text/html")
	return c.SendString(html)
}

// renderSilentAuthError 渲染静默认证错误页面
func renderSilentAuthError(c *fiber.Ctx, status int, redirectURI, state, errorCode string) error {
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
            error: '%s',
            state: '%s'
        };

        if (window.parent && window.parent !== window) {
            window.parent.postMessage(result, '*');
        }

        // 如果有redirect_uri，重定向到错误页面
        const redirectUri = '%s';
        if (redirectUri) {
            const params = new URLSearchParams({
                error: result.error,
                state: result.state || ''
            });
            window.location.href = redirectUri + '#' + params.toString();
        }
    </script>
</body>
</html>
        `, errorCode, state, redirectURI)

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

func preferredUsername(user *model.User) string {
	if user.Nickname != "" {
		return user.Nickname
	}
	return user.Email
}

func extractTokenFromRequest(c *fiber.Ctx) string {
	if authHeader := c.Get("Authorization"); strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	if token := c.Cookies("access_token"); token != "" {
		return token
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
