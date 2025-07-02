package common

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

// RegisterMiddlewares attaches global middlewares to the Fiber application.
func RegisterMiddlewares(app *fiber.App) {
	// Request logger
	app.Use(logger.New())

	// CORS with default configuration
	app.Use(cors.New())
}
