package main

import (
	common2 "basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/migration"
	subscription2 "basaltpass-backend/internal/public/subscription"
	"log"

	"basaltpass-backend/internal/api"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	userTeam "basaltpass-backend/internal/user/team"

	"os"

	"github.com/gofiber/fiber/v2"
)

func main() {
	// Load configuration (config file optional; env vars supported)
	cfgPath := os.Getenv("BASALTPASS_CONFIG")
	if _, err := config.Load(cfgPath); err != nil {
		log.Fatalf("[main][error] Failed to load config: %v", err)
	}

	// Print current environment
	log.Printf("[main][info] Environment: %s (develop=%v, staging=%v, production=%v)", config.Get().Env, config.IsDevelop(), config.IsStaging(), config.IsProduction())

	app := fiber.New()

	// Register global middlewares
	common2.RegisterMiddlewares(app)

	// Run DB migrations
	migration.RunMigrations()

	// 初始化团队处理器（用户侧）
	userTeam.InitHandler(common.DB())

	// 初始化订阅处理器
	subscription2.InitHandler(common.DB())

	// 初始化租户订阅处理器
	subscription2.InitTenantHandler(common.DB())

	// Register API routes
	api.RegisterRoutes(app)

	// Health-check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("[main][info] Health check OK")
	})

	addr := config.Get().Server.Address
	log.Printf("[main][info] Starting server on %s", addr)
	log.Fatal(app.Listen(addr))
}
