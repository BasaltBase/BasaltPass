package routes

import (
	"basaltpass-backend/internal/handler/public/currency"
	"basaltpass-backend/internal/handler/public/payment"
	publicSecurity "basaltpass-backend/internal/handler/public/security"
	publicSettings "basaltpass-backend/internal/handler/public/settings"
	"basaltpass-backend/internal/handler/public/signup"
	publicTenant "basaltpass-backend/internal/handler/public/tenant"
	"basaltpass-backend/internal/middleware/ratelimit"

	"github.com/gofiber/fiber/v2"
)

// RegisterPublicRoutes 注册公开路由（无需认证）
func RegisterPublicRoutes(v1 fiber.Router) {
	// 健康检查端点
	v1.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	// 新用户注册路由（带速率限制）
	signupHandler := signup.NewHandler()
	signupGroup := v1.Group("/signup",
		ratelimit.SetRateLimitHeaders(),
		ratelimit.SignupRateLimit(),
		ratelimit.EmailRateLimit(),
		ratelimit.DeviceRateLimit(),
	)
	signupGroup.Post("/start", signupHandler.StartSignupHandler)
	signupGroup.Post("/send_email_code", signupHandler.SendEmailCodeHandler)
	signupGroup.Post("/resend_email_code", signupHandler.ResendEmailCodeHandler)
	signupGroup.Post("/verify_email_code", signupHandler.VerifyEmailCodeHandler)
	signupGroup.Post("/complete", signupHandler.CompleteSignupHandler)
	signupGroup.Put("/change_email", signupHandler.ChangeEmailHandler)
	signupGroup.Get("/status/:signup_id", signupHandler.GetSignupStatusHandler)

	// 支付页面和模拟支付路由（无需认证，模拟真实Stripe行为）
	v1.Get("/payment/checkout/:session_id", payment.PaymentCheckoutHandler)
	v1.Post("/payment/simulate/:session_id", payment.SimulatePaymentHandler)

	// 货币系统路由（公开API，不需要认证）
	currencyGroup := v1.Group("/currencies")
	currencyGroup.Get("/", currency.GetCurrenciesHandler)
	currencyGroup.Get("/:code", currency.GetCurrencyHandler)

	// 公共安全路由（无需登录，带速率限制）
	publicSecurityHandler := publicSecurity.NewPublicSecurityHandler()
	securityGroup := v1.Group("/security",
		ratelimit.SetRateLimitHeaders(),
		ratelimit.EmailRateLimit(),
	)

	// 邮箱变更相关
	securityGroup.Get("/email/confirm", publicSecurityHandler.ConfirmEmailChangeHandler) // 确认邮箱变更
	securityGroup.Post("/email/cancel", publicSecurityHandler.CancelEmailChangeHandler)  // 取消邮箱变更

	// 密码重置相关
	securityGroup.Post("/password/reset", publicSecurityHandler.StartPasswordResetHandler)           // 发起密码重置
	securityGroup.Post("/password/reset/confirm", publicSecurityHandler.ConfirmPasswordResetHandler) // 确认密码重置

	// 租户公开信息路由（用于租户登录页面）
	v1.Get("/tenants/by-code/:code", publicTenant.GetTenantByCodeHandler)

	// 公开配置路由（用于前端获取系统配置）
	v1.Get("/config", publicSettings.GetPublicConfigHandler)
}
