package main

import (
	"log"

	"basaltpass-backend/internal/api"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/team"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	// Register global middlewares
	common.RegisterMiddlewares(app)

	// Run DB migrations
	common.RunMigrations()

	// 初始化团队处理器
	team.InitHandler(common.DB())

	// Register API routes
	api.RegisterRoutes(app)

	// Health-check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	log.Fatal(app.Listen(":8080"))
}
