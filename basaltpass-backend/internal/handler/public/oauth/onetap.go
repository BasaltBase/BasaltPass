package oauth

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
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
	// TODO ⬇️ 实现One-Tap登录逻辑
	var req OneTapAuthRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(OneTapAuthResponse{
			Success:   false,
			Error:     "invalid_request",
			ErrorDesc: "Invalid request format",
		})
	}

	// 1. 验证客户端ID
	// TODO ⬇️ 从数据库验证客户端
	
	// 2. 检查用户会话
	userID := getUserFromSession(c)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(OneTapAuthResponse{
			Success:   false,
			Error:     "login_required",
			ErrorDesc: "User not authenticated",
		})
	}

	// 3. 生成ID Token
	idToken, err := generateIDToken(userID, req.ClientID, req.Nonce)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(OneTapAuthResponse{
			Success:   false,
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
	// TODO ⬇️ 实现静默认证逻辑
	clientID := c.Query("client_id")
	prompt := c.Query("prompt")
	redirectURI := c.Query("redirect_uri")
	state := c.Query("state")
	nonce := c.Query("nonce")

	if clientID == "" {
		return c.Status(fiber.StatusBadRequest).SendString("Missing client_id")
	}

	// 检查prompt参数
	if prompt != "none" {
		return c.Status(fiber.StatusBadRequest).SendString("Invalid prompt parameter")
	}

	// 检查用户会话
	userID := getUserFromSession(c)
	if userID == "" {
		// 静默认证失败，返回错误页面
		return renderSilentAuthError(c, redirectURI, state, "login_required")
	}

	// 生成ID Token
	idToken, err := generateIDToken(userID, clientID, nonce)
	if err != nil {
		return renderSilentAuthError(c, redirectURI, state, "server_error")
	}

	// 返回成功页面，通过postMessage发送结果
	return renderSilentAuthSuccess(c, redirectURI, state, idToken)
}

// CheckSessionHandler 检查会话状态
// GET /oauth/check-session
func CheckSessionHandler(c *fiber.Ctx) error {
	// TODO ⬇️ 实现会话检查逻辑
	userID := getUserFromSession(c)
	
	return c.JSON(fiber.Map{
		"authenticated": userID != "",
		"user_id":      userID,
		"session_time": time.Now().Unix(),
	})
}

// getUserFromSession 从会话中获取用户ID
func getUserFromSession(c *fiber.Ctx) string {
	// TODO ⬇️ 实现会话检查逻辑
	// 1. 检查JWT token
	// 2. 检查会话cookie
	// 3. 验证用户状态
	
	// 临时实现：从Authorization header获取
	auth := c.Get("Authorization")
	if auth == "" {
		return ""
	}

	// 简单的JWT解析示例
	tokenString := ""
	if len(auth) > 7 && auth[:7] == "Bearer " {
		tokenString = auth[7:]
	}

	if tokenString == "" {
		return ""
	}

	// TODO ⬇️ 使用正确的JWT验证
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// TODO ⬇️ 使用正确的密钥验证
		return []byte("temporary-secret"), nil
	})

	if err != nil || !token.Valid {
		return ""
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if userID, exists := claims["sub"]; exists {
			return fmt.Sprintf("%v", userID)
		}
	}

	return ""
}

// generateIDToken 生成ID Token
func generateIDToken(userID, clientID, nonce string) (string, error) {
	// TODO ⬇️ 实现完整的ID Token生成
	now := time.Now()
	
	claims := jwt.MapClaims{
		"iss":   "http://localhost:8080", // TODO ⬇️ 使用正确的issuer
		"sub":   userID,
		"aud":   clientID,
		"exp":   now.Add(time.Hour).Unix(),
		"iat":   now.Unix(),
		"auth_time": now.Unix(),
	}

	if nonce != "" {
		claims["nonce"] = nonce
	}

	// TODO ⬇️ 使用RSA私钥签名
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte("temporary-secret"))
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
func renderSilentAuthError(c *fiber.Ctx, redirectURI, state, errorCode string) error {
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
	c.Status(fiber.StatusUnauthorized)
	return c.SendString(html)
}
