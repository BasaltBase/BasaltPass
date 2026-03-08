package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestClientScopeMiddleware_RejectsInsufficientScope(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("s2s_scopes", []string{"s2s.user.read"})
		return c.Next()
	})
	app.Use(ClientScopeMiddleware("s2s.user.write"))
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
	errObj, ok := body["error"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected nested error object, got %#v", body["error"])
	}
	if errObj["code"] != "insufficient_scope" {
		t.Fatalf("expected insufficient_scope, got %#v", errObj["code"])
	}
}

func TestClientScopeMiddleware_AllowsRequiredScope(t *testing.T) {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("s2s_scopes", []string{"s2s.user.read", "s2s.user.write"})
		return c.Next()
	})
	app.Use(ClientScopeMiddleware("s2s.user.write"))
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
