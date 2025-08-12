package routes

import (
	"basaltpass-backend/internal/public/payment"

	"github.com/gofiber/fiber/v2"
)

// RegisterPublicRoutes 注册公开路由（无需认证）
func RegisterPublicRoutes(v1 fiber.Router) {
	// 健康检查端点
	v1.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	v1.Get("/not-implemented", notImplemented)

	// 支付页面和模拟支付路由（无需认证，模拟真实Stripe行为）
	v1.Get("/payment/checkout/:session_id", payment.PaymentCheckoutHandler)
	v1.Post("/payment/simulate/:session_id", payment.SimulatePaymentHandler)
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
