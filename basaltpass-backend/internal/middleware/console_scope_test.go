package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func TestRequireConsoleScope_RejectsDefaultUserScope(t *testing.T) {
	app := fiber.New()
	app.Use(RequireConsoleScope("tenant"))
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
	if body["scope"] != "user" {
		t.Fatalf("expected default scope user, got %#v", body["scope"])
	}
}

func TestRequireConsoleScope_AllowsCachedScope(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("scope", "tenant")
		return c.Next()
	})
	app.Use(RequireConsoleScope("tenant"))
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestRequireConsoleScope_AllowsTokenClaimFallback(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user", &jwt.Token{Claims: jwt.MapClaims{"scp": "admin"}})
		return c.Next()
	})
	app.Use(RequireConsoleScope("admin"))
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
