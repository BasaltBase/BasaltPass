package routes

import (
	"basaltpass-backend/internal/payment"

	"github.com/gofiber/fiber/v2"
)

// RegisterPublicRoutes 注册公开路由（无需认证）
func RegisterPublicRoutes(app *fiber.App) {
	// 健康检查端点
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})
	app.Get("/not-implemented", notImplemented)

	// 支付页面和模拟支付路由（无需认证，模拟真实Stripe行为）
	app.Get("/payment/checkout/:session_id", payment.PaymentCheckoutHandler)
	app.Post("/payment/simulate/:session_id", payment.SimulatePaymentHandler)
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
