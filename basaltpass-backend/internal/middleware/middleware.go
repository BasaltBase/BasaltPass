package middleware

import (
	"errors"
	"strings"

	"basaltpass-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

// ErrorHandler provides a unified JSON error response for all handlers.
func ErrorHandler(c *fiber.Ctx, err error) error {
	// Default to 500 unless it's a *fiber.Error
	code := fiber.StatusInternalServerError
	var e *fiber.Error
	if errors.As(err, &e) {
		code = e.Code
	}
	// You can extend this to map custom domain errors to codes here.
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

	// CORS configuration from config
	c := config.Get().CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins:     strings.Join(c.AllowOrigins, ","),
		AllowMethods:     strings.Join(c.AllowMethods, ","),
		AllowHeaders:     strings.Join(c.AllowHeaders, ","),
		AllowCredentials: c.AllowCredentials,
		ExposeHeaders:    strings.Join(c.ExposeHeaders, ","),
		MaxAge:           c.MaxAgeSeconds,
	}))
}
