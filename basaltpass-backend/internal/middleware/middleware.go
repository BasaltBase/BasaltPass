package middleware

import (
	"strings"

	"basaltpass-backend/internal/config"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

// RegisterMiddlewares attaches global middlewares to the Fiber application.
func RegisterMiddlewares(app *fiber.App) {
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
