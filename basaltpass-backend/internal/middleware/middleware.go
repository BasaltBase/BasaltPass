package middleware

import (
	"errors"
	"strings"

	"basaltpass-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

/**
*
* Basalt Middleware Registration and Error Handling
* Registers global middlewares and provides unified error handling.
*
 */

// ErrorHandler provides a unified JSON error response for all handlers.
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Default to 500 unless it's a *fiber.Error
	code := fiber.StatusInternalServerError
	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
	}

	return c.Status(code).JSON(fiber.Map{
		"error":   err.Error(),
		"code":    code,
		"path":    c.Path(),
		"request": c.Locals("requestid"),
	})
}

// RegisterMiddlewares attaches global middlewares to the Fiber application.
func RegisterMiddlewares(app *fiber.App) {
	// Attach a request ID for tracing
	app.Use(requestid.New())

	// Recover from panics and return 500 instead of crashing
	app.Use(recover.New())

	// Request logger
	app.Use(logger.New())

	// Security headers (RFC-compliant, OWASP recommended)
	helmetCfg := helmet.Config{
		// 防止 MIME 类型嗅探攻击
		ContentTypeNosniff: "nosniff",
		// 防止 Clickjacking
		XFrameOptions: "DENY",
		// 旧版浏览器 XSS 过滤器（现代浏览器已内置保护，设为 0 符合最新建议）
		XSSProtection: "0",
		// 限制 Referrer 信息泄露
		ReferrerPolicy: "strict-origin-when-cross-origin",
		// 禁用不必要的浏览器特性
		PermissionPolicy: "camera=(), microphone=(), geolocation=(), payment=()",
		// CSP：纯 API 后端不提供 HTML，拒绝所有内容加载并禁止被嵌入
		ContentSecurityPolicy: "default-src 'none'; frame-ancestors 'none'",
		// 跨域隔离策略
		CrossOriginEmbedderPolicy: "require-corp",
		CrossOriginOpenerPolicy:   "same-origin",
		CrossOriginResourcePolicy: "same-origin",
	}
	// HSTS 仅在生产环境（HTTPS）下启用，避免开发环境 HTTP 被锁死
	if !config.IsDevelop() {
		helmetCfg.HSTSMaxAge = 31536000      // 1 年
		helmetCfg.HSTSExcludeSubdomains = false // 包含子域名
		helmetCfg.HSTSPreloadEnabled = true
	}
	app.Use(helmet.New(helmetCfg))

	// CORS configuration from config
	c := config.Get().CORS
	corsCfg := cors.Config{
		AllowMethods:     strings.Join(c.AllowMethods, ","),
		AllowHeaders:     strings.Join(c.AllowHeaders, ","),
		AllowCredentials: c.AllowCredentials,
		ExposeHeaders:    strings.Join(c.ExposeHeaders, ","),
		MaxAge:           c.MaxAgeSeconds,
	}

	// In develop, allow any Origin (useful for Dev Containers port-forwarding / tunnels)
	// while still echoing back the requesting Origin (required when AllowCredentials=true).
	if config.IsDevelop() {
		corsCfg.AllowOriginsFunc = func(origin string) bool {
			return origin != ""
		}
	} else {
		corsCfg.AllowOrigins = strings.Join(c.AllowOrigins, ",")
	}

	app.Use(cors.New(corsCfg))
}
