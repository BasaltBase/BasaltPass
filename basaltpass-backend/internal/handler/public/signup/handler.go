package signup

import (
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/verification"
	"errors"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// Handler 注册相关的处理器
type Handler struct {
	verificationSvc *verification.Service
}

// NewHandler 创建新的处理器
func NewHandler() *Handler {
	return &Handler{
		verificationSvc: verification.NewService(),
	}
}

// StartSignupHandler 开始注册流程 POST /signup/start
func (h *Handler) StartSignupHandler(c *fiber.Ctx) error {
	var req verification.StartSignupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}

	// 从上下文获取IP和User-Agent
	req.IP = c.IP()
	req.UserAgent = c.Get("User-Agent")

	response, err := h.verificationSvc.StartSignup(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// SendEmailCodeHandler 发送邮箱验证码 POST /signup/send_email_code
func (h *Handler) SendEmailCodeHandler(c *fiber.Ctx) error {
	var req verification.SendVerificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}

	// 设置为邮箱渠道
	req.Channel = model.ChallengeChannelEmail

	if err := h.verificationSvc.SendVerificationCode(req); err != nil {
		// 注意：为了安全，我们总是返回统一的响应
		// 不暴露具体的错误信息，以防止枚举攻击
	}

	return c.JSON(fiber.Map{
		"message": "If eligible, we sent a verification code to your email.",
	})
}

// ResendEmailCodeHandler 重发邮箱验证码 POST /signup/resend_email_code
func (h *Handler) ResendEmailCodeHandler(c *fiber.Ctx) error {
	var req verification.SendVerificationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}

	req.Channel = model.ChallengeChannelEmail

	// 重发逻辑与发送相同
	if err := h.verificationSvc.SendVerificationCode(req); err != nil {
		// 统一响应
	}

	return c.JSON(fiber.Map{
		"message": "If eligible, we resent the verification code to your email.",
	})
}

// VerifyEmailCodeHandler 验证邮箱验证码 POST /signup/verify_email_code
func (h *Handler) VerifyEmailCodeHandler(c *fiber.Ctx) error {
	var req verification.VerifyCodeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}

	if err := h.verificationSvc.VerifyCode(req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Email verified successfully",
	})
}

// CompleteSignupHandler 完成注册 POST /signup/complete
func (h *Handler) CompleteSignupHandler(c *fiber.Ctx) error {
	var req verification.CompleteSignupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}

	user, err := h.verificationSvc.CompleteSignup(req)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Signup session not found or expired",
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Registration completed successfully",
		"user_id": user.ID,
	})
}

// ChangeEmailHandler 更改邮箱地址（在验证前） PUT /signup/change_email
func (h *Handler) ChangeEmailHandler(c *fiber.Ctx) error {
	var req struct {
		SignupID string `json:"signup_id"`
		NewEmail string `json:"new_email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request format",
		})
	}

	// TODO: 实现邮箱更改逻辑
	// 1. 验证新邮箱格式
	// 2. 更新pending_signup记录
	// 3. 使旧的验证码挑战失效
	// 4. 为了安全，总是返回成功响应

	return c.JSON(fiber.Map{
		"message": "If eligible, email address updated",
	})
}

// GetSignupStatusHandler 获取注册状态 GET /signup/status/:signup_id
func (h *Handler) GetSignupStatusHandler(c *fiber.Ctx) error {
	signupID := c.Params("signup_id")
	if signupID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Signup ID required",
		})
	}

	// TODO: 实现状态查询逻辑
	// 注意：只返回必要的状态信息，不要暴露敏感数据

	return c.JSON(fiber.Map{
		"signup_id": signupID,
		"status":    "pending_email_verification",
		"message":   "Please check your email and enter the verification code",
	})
}
