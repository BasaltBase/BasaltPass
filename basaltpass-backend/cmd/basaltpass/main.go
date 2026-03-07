package main

// Reviewed by zeturn 2026

import (
	v1 "basaltpass-backend/internal/api/v1"
	config "basaltpass-backend/internal/config"
	middleware "basaltpass-backend/internal/middleware"
	migration "basaltpass-backend/internal/migration"
	usersettings "basaltpass-backend/internal/service/settings"
	utils "basaltpass-backend/internal/utils"

	"fmt"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
)

func printBanner() {
	banner := `
 ____                  _ _   ____               
| __ )  __ _ ___  __ _| | |_|  _ \ __ _ ___ ___ 
|  _ \ / _' / __|/ _' | | __| |_) / _' / __/ __|
| |_) | (_| \__ \ (_| | | |_|  __/ (_| \__ \__ \
|____/ \__,_|___/\__,_|_|\__|_|   \__,_|___/___/
                        by HollowData
`
	fmt.Print(banner)
}

func main() {
	printBanner()

	// Load configuration (config file optional; env vars supported)
	cfgPath := os.Getenv("BASALTPASS_CONFIG")
	if _, err := config.Load(cfgPath); err != nil {
		log.Fatalf("[main][error] Failed to load config: %v", err)
	}

	// Print current environment
	log.Printf("[main][info] Environment: %s (develop=%v, staging=%v, production=%v)", config.Get().Env, config.IsDevelop(), config.IsStaging(), config.IsProduction())

	// Load file-based system settings into cache
	if err := usersettings.Reload(); err != nil {
		log.Printf("[main][warn] Settings reload failed: %v", err)
	}

	app := fiber.New(fiber.Config{
		ErrorHandler: middleware.ErrorHandler,
	})

	// Register global middlewares
	middleware.RegisterMiddlewares(app)

	// Run DB migrations
	migration.RunMigrations()

	// Register API routes
	v1.RegisterRoutes(app)

	// Health-check route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("[main][info] Health check OK")
	})

	// Export route map in develop for auditing
	if config.IsDevelop() {
		// scripts/dev.sh runs the backend with CWD=basaltpass-backend.
		// Export to the repo-level docs folder.
		if err := utils.DumpRoutes(app, "../docs/ROUTES.md"); err != nil {
			log.Printf("[main][warn] Route dump failed: %v", err)
		} else {
			log.Printf("[main][info] Route map exported to ../docs/ROUTES.md")
		}
	}

	addr := config.Get().Server.Address
	log.Printf("[main][info] Starting server on %s", addr)
	log.Fatal(app.Listen(addr))
}
