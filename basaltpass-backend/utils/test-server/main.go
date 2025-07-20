package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

func main() {
	app := fiber.New()

	// CORS configuration
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "http://localhost:5173,http://127.0.0.1:5173",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
		AllowCredentials: true,
	}))

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("ok")
	})

	// Test register endpoint
	app.Post("/api/v1/auth/register", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Registration endpoint working",
			"status":  "success",
		})
	})

	// Test login endpoint
	app.Post("/api/v1/auth/login", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Login endpoint working",
			"status":  "success",
		})
	})

	log.Fatal(app.Listen(":8080"))
}
