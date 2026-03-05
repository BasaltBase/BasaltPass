package passkey

import (
	passkey2 "basaltpass-backend/internal/service/passkey"
	"net/http"
	"strconv"
	"sync"

	"log"

	security "basaltpass-backend/internal/handler/user/security"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/gofiber/fiber/v2"
	"github.com/valyala/fasthttp/fasthttpadaptor"
)

var svc = passkey2.Service{}

// sessionStoreMap 并发安全的 session 存储，生产环境应替换为 Redis
type sessionStoreMap struct {
	mu sync.RWMutex
	m  map[string]*webauthn.SessionData
}

func (s *sessionStoreMap) Set(key string, v *webauthn.SessionData) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.m[key] = v
}

func (s *sessionStoreMap) Get(key string) (*webauthn.SessionData, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	v, ok := s.m[key]
	return v, ok
}

func (s *sessionStoreMap) Delete(key string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.m, key)
}

var sessionStore = &sessionStoreMap{m: make(map[string]*webauthn.SessionData)}

func newRequestContext(c *fiber.Ctx, data map[string]interface{}) *passkey2.RequestContext {
	return &passkey2.RequestContext{
		IP:        c.IP(),
		UserAgent: c.Get(fiber.HeaderUserAgent),
		Data:      data,
	}
}

// getUserID 从 JWT context 中安全获取用户ID
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

// getTenantID 从请求中提取租户ID：
// 优先从 JWT locals 取，其次从 X-Tenant-ID header 取，最后从请求 body 中的 tenant_id 取。
// 返回 0 表示系统租户。
func getTenantID(c *fiber.Ctx) uint {
	if tidVal := c.Locals("tenantID"); tidVal != nil {
		if tid, ok := tidVal.(uint); ok {
			return tid
		}
	}
	if tidStr := c.Get("X-Tenant-ID"); tidStr != "" {
		if tid, err := strconv.ParseUint(tidStr, 10, 32); err == nil {
			return uint(tid)
		}
	}
	return 0
}

// convertFiberToHTTP 将 Fiber 请求转换为标准 HTTP 请求（go-webauthn 需要）
func convertFiberToHTTP(c *fiber.Ctx) *http.Request {
	var req http.Request
	fasthttpadaptor.ConvertRequest(c.Context(), &req, true)
	return &req
}

// BeginRegistrationHandler 开始 Passkey 注册流程（需要 JWT）
// POST /api/v1/passkey/register/begin
func BeginRegistrationHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}
	tenantID := getTenantID(c)

	user, err := svc.PrepareUserForWebAuthn(userID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	webAuthn, err := svc.GetWebAuthnInstance(tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize WebAuthn"})
	}

	options, sessionData, err := webAuthn.BeginRegistration(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	sessionStore.Set(sessionData.Challenge, sessionData)
	return c.JSON(options)
}

// FinishRegistrationHandler 完成 Passkey 注册流程（需要 JWT）
// POST /api/v1/passkey/register/finish
func FinishRegistrationHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}
	tenantID := getTenantID(c)

	var req struct {
		Name      string `json:"name"`
		Challenge string `json:"challenge"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	sessionData, exists := sessionStore.Get(req.Challenge)
	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid or expired session"})
	}

	user, err := svc.PrepareUserForWebAuthn(userID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	webAuthn, err := svc.GetWebAuthnInstance(tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize WebAuthn"})
	}

	credential, err := webAuthn.FinishRegistration(user, *sessionData, convertFiberToHTTP(c))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	passkey, err := svc.SavePasskey(userID, tenantID, req.Name, credential)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	sessionStore.Delete(req.Challenge)

	return c.JSON(fiber.Map{
		"id":         passkey.ID,
		"name":       passkey.Name,
		"created_at": passkey.CreatedAt,
	})
}

// BeginLoginHandler 开始 Passkey 登录流程（无需 JWT，用于直接以 passkey 作为主登录方式）
// POST /api/v1/passkey/login/begin
func BeginLoginHandler(c *fiber.Ctx) error {
	var req struct {
		Email    string `json:"email"`
		TenantID uint   `json:"tenant_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	tenantID := req.TenantID
	if tenantID == 0 {
		tenantID = getTenantID(c)
	}

	user, err := svc.GetUserByEmailInTenant(req.Email, tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User not found"})
	}

	if len(user.Passkeys) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No passkeys registered for this user in this tenant"})
	}

	webAuthn, err := svc.GetWebAuthnInstance(tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize WebAuthn"})
	}

	options, sessionData, err := webAuthn.BeginLogin(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	sessionStore.Set(sessionData.Challenge, sessionData)
	return c.JSON(options)
}

// FinishLoginHandler 完成 Passkey 登录流程（无需 JWT）
// POST /api/v1/passkey/login/finish
func FinishLoginHandler(c *fiber.Ctx) error {
	var req struct {
		Email     string `json:"email"`
		Challenge string `json:"challenge"`
		TenantID  uint   `json:"tenant_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	tenantID := req.TenantID
	if tenantID == 0 {
		tenantID = getTenantID(c)
	}

	sessionData, exists := sessionStore.Get(req.Challenge)
	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid or expired session"})
	}

	user, err := svc.GetUserByEmailInTenant(req.Email, tenantID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found"})
	}

	webAuthn, err := svc.GetWebAuthnInstance(tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize WebAuthn"})
	}

	credential, err := webAuthn.FinishLogin(user, *sessionData, convertFiberToHTTP(c))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "WebAuthn verification failed: " + err.Error()})
	}

	if err := svc.UpdatePasskeyUsage(credential.ID, tenantID, credential.Authenticator.SignCount); err != nil {
		log.Printf("failed to update passkey usage: %v", err)
	}

	ctx := newRequestContext(c, map[string]interface{}{"email": req.Email, "tenant_id": tenantID})
	tokens, err := svc.GenerateTokensForUser(user.ID, ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	sessionStore.Delete(req.Challenge)

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		Secure:   c.Secure(),
		SameSite: "Lax",
	})

	if err := security.RecordLoginSuccess(user.ID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}

	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})
}

// Begin2FAHandler 开始 Passkey 2FA 验证流程。
// 用户已通过账号密码验证，此接口生成 WebAuthn challenge。
// POST /api/v1/passkey/2fa/begin
func Begin2FAHandler(c *fiber.Ctx) error {
	var req struct {
		UserID   uint `json:"user_id"`
		TenantID uint `json:"tenant_id"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id required"})
	}

	tenantID := req.TenantID
	if tenantID == 0 {
		tenantID = getTenantID(c)
	}

	user, err := svc.PrepareUserForWebAuthn(req.UserID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User not found"})
	}

	if len(user.Passkeys) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No passkeys registered for this user in this tenant"})
	}

	webAuthn, err := svc.GetWebAuthnInstance(tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize WebAuthn"})
	}

	options, sessionData, err := webAuthn.BeginLogin(user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// 用 "2fa:" 前缀区分 2FA session 与独立登录 session，避免 key 碰撞
	sessionKey := "2fa:" + sessionData.Challenge
	sessionStore.Set(sessionKey, sessionData)

	return c.JSON(fiber.Map{
		"options":   options,
		"challenge": sessionData.Challenge,
	})
}

// Finish2FAHandler 完成 Passkey 2FA 验证，验证成功后颁发 JWT。
// POST /api/v1/passkey/2fa/finish
func Finish2FAHandler(c *fiber.Ctx) error {
	var req struct {
		UserID    uint   `json:"user_id"`
		TenantID  uint   `json:"tenant_id"`
		Challenge string `json:"challenge"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.UserID == 0 || req.Challenge == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "user_id and challenge required"})
	}

	tenantID := req.TenantID
	if tenantID == 0 {
		tenantID = getTenantID(c)
	}

	sessionKey := "2fa:" + req.Challenge
	sessionData, exists := sessionStore.Get(sessionKey)
	if !exists {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid or expired 2FA session"})
	}

	user, err := svc.PrepareUserForWebAuthn(req.UserID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User not found"})
	}

	webAuthn, err := svc.GetWebAuthnInstance(tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to initialize WebAuthn"})
	}

	credential, err := webAuthn.FinishLogin(user, *sessionData, convertFiberToHTTP(c))
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "WebAuthn verification failed: " + err.Error()})
	}

	if err := svc.UpdatePasskeyUsage(credential.ID, tenantID, credential.Authenticator.SignCount); err != nil {
		log.Printf("failed to update passkey usage: %v", err)
	}

	ctx := newRequestContext(c, map[string]interface{}{
		"user_id":   req.UserID,
		"tenant_id": tenantID,
		"2fa_type":  "passkey",
	})
	tokens, err := svc.GenerateTokensForUser(user.ID, ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	sessionStore.Delete(sessionKey)

	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokens.RefreshToken,
		HTTPOnly: true,
		Path:     "/",
		MaxAge:   7 * 24 * 60 * 60,
		Secure:   c.Secure(),
		SameSite: "Lax",
	})

	if err := security.RecordLoginSuccess(user.ID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}

	return c.JSON(fiber.Map{"access_token": tokens.AccessToken})
}

// ListPasskeysHandler 获取当前用户在当前租户下的 Passkey 列表（需要 JWT）
// GET /api/v1/passkey/list
func ListPasskeysHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}
	tenantID := getTenantID(c)

	passkeys, err := svc.ListPasskeys(userID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
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

// DeletePasskeyHandler 删除指定的 Passkey（需要 JWT）
// DELETE /api/v1/passkey/:id
func DeletePasskeyHandler(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return err
	}
	tenantID := getTenantID(c)

	passkeyID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid passkey ID"})
	}

	ctx := newRequestContext(c, map[string]interface{}{"passkey_id": passkeyID})
	if err := svc.DeletePasskey(userID, tenantID, uint(passkeyID), ctx); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Passkey deleted successfully"})
}
