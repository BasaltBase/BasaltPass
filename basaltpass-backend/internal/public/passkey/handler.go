package passkey

import (
	"net/http"
	"strconv"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp/fasthttpadaptor"
)

// 服务实例
var svc = Service{}

// Session存储 - 简化实现，在生产环境中应该使用更安全的session存储
var sessionStore = make(map[string]*webauthn.SessionData)

// getUserID 安全地从context中获取用户ID
func getUserID(c *fiber.Ctx) (uint, error) {
	userIDVal := c.Locals("userID")
	if userIDVal == nil {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "User not authenticated")
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "Invalid user ID")
	}
	return userID, nil
}

// convertFiberToHTTP 将Fiber请求转换为标准HTTP请求
func convertFiberToHTTP(c *fiber.Ctx) *http.Request {
	var req http.Request
	fasthttpadaptor.ConvertRequest(c.Context(), &req, true)
	return &req
}

// BeginRegistrationHandler 开始Passkey注册流程
// POST /api/v1/passkey/register/begin
func BeginRegistrationHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	// 准备用户
	user, err := svc.PrepareUserForWebAuthn(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 获取WebAuthn实例
	webAuthn, err := svc.GetWebAuthnInstance()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize WebAuthn",
		})
	}

	// 开始注册
	options, sessionData, err := webAuthn.BeginRegistration(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 存储session数据 (简化实现)
	sessionKey := sessionData.Challenge
	sessionStore[sessionKey] = sessionData

	return c.JSON(options)
}

// FinishRegistrationHandler 完成Passkey注册流程
// POST /api/v1/passkey/register/finish
func FinishRegistrationHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	var req struct {
		Name      string `json:"name"`      // 用户给passkey起的名字
		Challenge string `json:"challenge"` // 从开始注册时获得的challenge
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 从session存储中获取session数据
	sessionData, exists := sessionStore[req.Challenge]
	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session",
		})
	}

	// 准备用户
	user, err := svc.PrepareUserForWebAuthn(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 获取WebAuthn实例
	webAuthn, err := svc.GetWebAuthnInstance()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize WebAuthn",
		})
	}

	// 完成注册 - 转换Fiber请求为HTTP请求
	httpReq := convertFiberToHTTP(c)
	credential, err := webAuthn.FinishRegistration(user, *sessionData, httpReq)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 保存Passkey
	passkey, err := svc.SavePasskey(userID, req.Name, credential)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 清理session数据
	delete(sessionStore, req.Challenge)

	return c.JSON(fiber.Map{
		"id":         passkey.ID,
		"name":       passkey.Name,
		"created_at": passkey.CreatedAt,
	})
}

// BeginLoginHandler 开始Passkey登录流程
// POST /api/v1/passkey/login/begin
func BeginLoginHandler(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"` // 用户邮箱，用于查找用户
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 获取用户
	user, err := svc.GetUserByEmail(req.Email)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if len(user.Passkeys) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No passkeys registered for this user",
		})
	}

	// 获取WebAuthn实例
	webAuthn, err := svc.GetWebAuthnInstance()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize WebAuthn",
		})
	}

	// 开始登录
	options, sessionData, err := webAuthn.BeginLogin(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 存储session数据
	sessionKey := sessionData.Challenge
	sessionStore[sessionKey] = sessionData

	return c.JSON(options)
}

// FinishLoginHandler 完成Passkey登录流程
// POST /api/v1/passkey/login/finish
func FinishLoginHandler(c *fiber.Ctx) error {
	var req struct {
		Email     string `json:"email"`     // 用户邮箱
		Challenge string `json:"challenge"` // 从开始登录时获得的challenge
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 从session存储中获取session数据
	sessionData, exists := sessionStore[req.Challenge]
	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid session",
		})
	}

	// 获取用户
	user, err := svc.GetUserByEmail(req.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 获取WebAuthn实例
	webAuthn, err := svc.GetWebAuthnInstance()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize WebAuthn",
		})
	}

	// 完成登录 - 转换Fiber请求为HTTP请求
	httpReq := convertFiberToHTTP(c)
	credential, err := webAuthn.FinishLogin(user, *sessionData, httpReq)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 更新Passkey使用记录
	err = svc.UpdatePasskeyUsage(credential.ID, credential.Authenticator.SignCount)
	if err != nil {
		// 记录错误但不影响登录流程
		// TODO: 添加日志记录
	}

	// 生成JWT tokens
	tokens, err := svc.GenerateTokensForUser(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 清理session数据
	delete(sessionStore, req.Challenge)

	// 设置refresh token cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
	})

	return c.JSON(fiber.Map{
		"access_token": tokens.AccessToken,
	})
}

// ListPasskeysHandler 获取用户的Passkey列表
// GET /api/v1/passkey/list
func ListPasskeysHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}

	passkeys, err := svc.ListPasskeys(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	var result []fiber.Map
	for _, passkey := range passkeys {
		result = append(result, fiber.Map{
			"id":           passkey.ID,
			"name":         passkey.Name,
			"created_at":   passkey.CreatedAt,
			"last_used_at": passkey.LastUsedAt,
		})
	}

	return c.JSON(result)
}

// DeletePasskeyHandler 删除指定的Passkey
// DELETE /api/v1/passkey/:id
func DeletePasskeyHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}
	passkeyIDStr := c.Params("id")

	passkeyID, err := strconv.ParseUint(passkeyIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid passkey ID",
		})
	}

	err = svc.DeletePasskey(userID, uint(passkeyID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Passkey deleted successfully",
	})
}
