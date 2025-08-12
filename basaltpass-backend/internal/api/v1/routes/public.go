package routes

import (
	"basaltpass-backend/internal/debug"
	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/public/currency"
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

	// 调试路由
	debugGroup := v1.Group("/debug", middleware.JWTMiddleware())
	debugGroup.Get("/user-tenant", debug.CheckUserTenantHandler)

	// 支付页面和模拟支付路由（无需认证，模拟真实Stripe行为）
	v1.Get("/payment/checkout/:session_id", payment.PaymentCheckoutHandler)
	v1.Post("/payment/simulate/:session_id", payment.SimulatePaymentHandler)

	// 货币系统路由（公开API，不需要认证）
	currencyGroup := v1.Group("/currencies")
	currencyGroup.Get("/", currency.GetCurrenciesHandler)
	currencyGroup.Get("/:code", currency.GetCurrencyHandler)
}

func notImplemented(c *fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"message": "not implemented",
	})
}
