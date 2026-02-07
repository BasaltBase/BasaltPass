package s2s

import (
	"github.com/gofiber/fiber/v2"
)

// GET /api/v1/s2s/health
func GetHealthHandler(c *fiber.Ctx) error {
	return unifiedResponse(c, fiber.StatusOK, fiber.Map{"status": "ok"}, nil)
}

// GET /api/v1/s2s/me
func GetMeHandler(c *fiber.Ctx) error {
	clientID, _ := c.Locals("s2s_client_id").(string)
	appID, _ := c.Locals("s2s_app_id").(uint)
	tenantID, _ := c.Locals("s2s_tenant_id").(uint)
	scopesAny := c.Locals("s2s_scopes")
	scopes, _ := scopesAny.([]string)

	return unifiedResponse(c, fiber.StatusOK, fiber.Map{
		"client_id": clientID,
		"app_id":    appID,
		"tenant_id": tenantID,
		"scopes":    scopes,
	}, nil)
}
