package main

import (
	v1 "basaltpass-backend/internal/api/v1"
	"basaltpass-backend/internal/handler/public/subscription"
	userTeam "basaltpass-backend/internal/handler/user/team"
	common2 "basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/migration"
	usersettings "basaltpass-backend/internal/service/settings"
	"log"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/utils"

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

	// Load file-based system settings into cache
	if err := usersettings.Reload(); err != nil {
		log.Printf("[main][warn] settings reload failed: %v", err)
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: common2.ErrorHandler,
	})

	// Register global middlewares
	common2.RegisterMiddlewares(app)

	// Run DB migrations
	migration.RunMigrations()

	// 初始化团队处理器（用户侧）
	userTeam.InitHandler(common.DB())

	// 初始化订阅处理器
	subscription.InitHandler(common.DB())

	// 初始化租户订阅处理器
	subscription.InitTenantHandler(common.DB())

	// Register API routes
	v1.RegisterRoutes(app)

	// Health-check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("[main][info] Health check OK")
	})

	// Export route map in develop for auditing
	if config.IsDevelop() {
		if err := utils.DumpRoutes(app, "docs/ROUTES.md"); err != nil {
			log.Printf("[main][warn] route dump failed: %v", err)
		} else {
			log.Printf("[main][info] route map exported to docs/ROUTES.md")
		}
	}

	addr := config.Get().Server.Address
	log.Printf("[main][info] Starting server on %s", addr)
	log.Fatal(app.Listen(addr))
}
