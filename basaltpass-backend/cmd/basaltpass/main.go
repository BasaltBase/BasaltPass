package main

import (
	common2 "basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/migration"
	"log"

	"basaltpass-backend/internal/api"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/subscription"
	"basaltpass-backend/internal/team"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	// Register global middlewares
	common2.RegisterMiddlewares(app)

	// Run DB migrations
	migration.RunMigrations()

	// 初始化团队处理器
	team.InitHandler(common.DB())

	// 初始化订阅处理器
	subscription.InitHandler(common.DB())

	// 初始化租户订阅处理器
	subscription.InitTenantHandler(common.DB())

	// Register API routes
	api.RegisterRoutes(app)

	// Health-check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	log.Fatal(app.Listen(":8080"))
}
