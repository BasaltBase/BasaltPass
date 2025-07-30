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

	// CORS configuration for frontend
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS,PATCH",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization,X-Requested-With,Access-Control-Request-Method,Access-Control-Request-Headers,X-Tenant-ID",
		AllowCredentials: true,
		ExposeHeaders:    "Authorization,Content-Length,Access-Control-Allow-Origin,Access-Control-Allow-Headers,Cache-Control,Content-Language,Content-Type,Expires,Last-Modified,Pragma",
		MaxAge:           86400, // 24 hours
	}))
}
