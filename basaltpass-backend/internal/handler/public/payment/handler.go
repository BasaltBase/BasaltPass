package payment

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	payment2 "basaltpass-backend/internal/service/payment"
	"basaltpass-backend/internal/service/wallet"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func requireSuperAdmin(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	var user model.User
	if err := common.DB().Select("id", "is_system_admin").First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	if !user.IsSuperAdmin() {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Basalt super admin access required",
		})
	}
	return nil
}

func resolvePaymentTenantID(c *fiber.Ctx) uint {
	if tid, ok := c.Locals("tenantID").(uint); ok && tid > 0 {
		return tid
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok || userID == 0 {
		return 0
	}

	var user model.User
	if err := common.DB().Select("id", "tenant_id").First(&user, userID).Error; err == nil {
		if user.TenantID > 0 {
			return user.TenantID
		}
	}

	var membership model.TenantUser
	if err := common.DB().Select("tenant_id").Where("user_id = ?", userID).Order("created_at ASC").First(&membership).Error; err == nil {
		return membership.TenantID
	}

	return 0
}

// CreatePaymentIntentHandler POST /payment/intents - 创建支付意图
func CreatePaymentIntentHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	activeTenantID := resolvePaymentTenantID(c)

	var req payment2.CreatePaymentIntentRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// 验证必填字段
	if req.Amount <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Amount must be positive",
		})
	}

	paymentIntent, mockResponse, err := payment2.CreatePaymentIntentForTenant(userID, activeTenantID, req)
	if err != nil {
		if errors.Is(err, payment2.ErrTenantStripeNotConfigured) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "当前租户未配置可用的 Stripe Key，请先在租户控制台完成配置",
			})
		}
		if errors.Is(err, wallet.ErrWalletRechargeWithdrawDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"payment_intent":       paymentIntent,
		"stripe_mock_response": mockResponse,
	})
}

// CreatePaymentSessionHandler POST /payment/sessions - 创建支付会话
func CreatePaymentSessionHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	activeTenantID := resolvePaymentTenantID(c)

	var req payment2.CreatePaymentSessionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	session, mockResponse, err := payment2.CreatePaymentSessionForTenant(userID, activeTenantID, req)
	if err != nil {
		if errors.Is(err, payment2.ErrTenantStripeNotConfigured) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "当前租户未配置可用的 Stripe Key，请先在租户控制台完成配置",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"session":              session,
		"stripe_mock_response": mockResponse,
	})
}

// GetPaymentIntentHandler GET /payment/intents/:id - 获取支付意图
func GetPaymentIntentHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	activeTenantID := resolvePaymentTenantID(c)

	paymentIntentIDStr := c.Params("id")
	paymentIntentID, err := strconv.ParseUint(paymentIntentIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid payment intent ID",
		})
	}

	paymentIntent, err := payment2.GetPaymentIntentForTenant(userID, uint(paymentIntentID), activeTenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "[GetPaymentIntentHandler] Payment intent not found",
		})
	}

	return c.JSON(paymentIntent)
}

// GetPaymentSessionHandler GET /payment/sessions/:session_id - 获取支付会话
func GetPaymentSessionHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	activeTenantID := resolvePaymentTenantID(c)
	sessionID := c.Params("session_id")

	session, err := payment2.GetPaymentSessionForTenant(userID, sessionID, activeTenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Payment session not found",
		})
	}

	return c.JSON(session)
}

// ListPaymentIntentsHandler GET /payment/intents - 获取支付意图列表
func ListPaymentIntentsHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	activeTenantID := resolvePaymentTenantID(c)

	limitStr := c.Query("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit > 100 {
		limit = 100 // 限制最大查询数量
	}

	paymentIntents, err := payment2.ListPaymentIntentsForTenant(userID, activeTenantID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"payment_intents": paymentIntents,
		"count":           len(paymentIntents),
	})
}

// SimulatePaymentHandler POST /payment/simulate/:session_id - 模拟支付处理
func SimulatePaymentHandler(c *fiber.Ctx) error {
	if err := requireSuperAdmin(c); err != nil {
		return err
	}

	sessionID := c.Params("session_id")

	var req struct {
		Success bool `json:"success"`
	}
	if err := c.BodyParser(&req); err != nil {
		// 默认为成功支付
		req.Success = true
	}

	mockResponse, err := payment2.SimulatePayment(sessionID, req.Success)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message":              "Payment simulation completed",
		"success":              req.Success,
		"stripe_mock_response": mockResponse,
	})
}

// PaymentCheckoutHandler GET /payment/checkout/:session_id - 支付页面
func PaymentCheckoutHandler(c *fiber.Ctx) error {
	sessionID := c.Params("session_id")

	session, err := payment2.GetPaymentSessionByStripeID(sessionID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Payment session not found",
		})
	}
	if strings.TrimSpace(session.PaymentURL) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Payment URL is empty",
		})
	}

	return c.Redirect(session.PaymentURL, fiber.StatusFound)
}

// StripeWebhookHandler POST /payment/webhook/stripe - Stripe Webhook入口
func StripeWebhookHandler(c *fiber.Ctx) error {
	signature := strings.TrimSpace(c.Get("Stripe-Signature"))
	if signature == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "missing Stripe-Signature header",
		})
	}

	payload := c.Body()
	eventID, eventType, err := payment2.ProcessStripeWebhook(payload, signature)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"received":   true,
		"event_id":   eventID,
		"event_type": eventType,
	})
}

// StripeWebhookStatusHandler GET /payment/webhook/stripe/events/:event_id - 查询webhook处理状态
func StripeWebhookStatusHandler(c *fiber.Ctx) error {
	if err := requireSuperAdmin(c); err != nil {
		return err
	}

	eventID := strings.TrimSpace(c.Params("event_id"))
	status, err := payment2.GetWebhookEventStatus(eventID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Webhook event not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"webhook_event": status,
	})
}
