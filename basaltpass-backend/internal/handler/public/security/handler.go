package security

import (
	"basaltpass-backend/internal/common"
	securityservice "basaltpass-backend/internal/service/security"

	"github.com/gofiber/fiber/v2"
)

// PublicSecurityHandler 公共安全处理器（无需登录）
type PublicSecurityHandler struct {
	securitySvc *securityservice.Service
}

// NewPublicSecurityHandler 创建公共安全处理器
func NewPublicSecurityHandler() *PublicSecurityHandler {
	return &PublicSecurityHandler{
		securitySvc: securityservice.NewService(common.DB()),
	}
}

// ConfirmEmailChangeHandler 确认邮箱变更
// GET /api/v1/public/security/email/confirm
func (h *PublicSecurityHandler) ConfirmEmailChangeHandler(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "缺少验证令牌",
		})
	}

	if err := h.securitySvc.ConfirmEmailChange(token); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "邮箱变更成功",
	})
}

// CancelEmailChangeHandler 取消邮箱变更
// POST /api/v1/public/security/email/cancel
func (h *PublicSecurityHandler) CancelEmailChangeHandler(c *fiber.Ctx) error {
	token := c.Query("token")
	if token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "缺少取消令牌",
		})
	}

	if err := h.securitySvc.CancelEmailChange(token); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "邮箱变更已取消",
	})
}

// StartPasswordResetHandler 开始密码重置流程
// POST /api/v1/public/security/password/reset
func (h *PublicSecurityHandler) StartPasswordResetHandler(c *fiber.Ctx) error {
	var req securityservice.PasswordResetRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数无效",
		})
	}

	// 获取客户端信息
	clientIP := c.IP()
	deviceHash := c.Get("X-Device-Hash", "")

	if err := h.securitySvc.StartPasswordReset(&req, clientIP, deviceHash); err != nil {
		// 始终返回相同的成功消息，防止邮箱枚举
		return c.JSON(fiber.Map{
			"message": "如果该邮箱存在，我们已发送密码重置邮件",
		})
	}

	return c.JSON(fiber.Map{
		"message": "如果该邮箱存在，我们已发送密码重置邮件",
	})
}

// ConfirmPasswordResetHandler 确认密码重置
// POST /api/v1/public/security/password/reset/confirm
func (h *PublicSecurityHandler) ConfirmPasswordResetHandler(c *fiber.Ctx) error {
	var req securityservice.PasswordResetConfirmRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数无效",
		})
	}

	// 获取客户端信息
	clientIP := c.IP()
	deviceHash := c.Get("X-Device-Hash", "")

	if err := h.securitySvc.ConfirmPasswordReset(&req, clientIP, deviceHash); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "密码重置成功，请重新登录",
	})
}
