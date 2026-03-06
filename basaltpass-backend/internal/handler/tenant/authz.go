package tenant

import (
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

func requireTenantAdminRole(c *fiber.Ctx) error {
	roleAny := c.Locals("tenantRole")
	if roleAny == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing tenant role context",
		})
	}

	var role model.TenantRole
	switch v := roleAny.(type) {
	case model.TenantRole:
		role = v
	case string:
		role = model.TenantRole(v)
	default:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid tenant role context",
		})
	}

	if role != model.TenantRoleOwner && role != model.TenantRoleAdmin {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Tenant admin access required",
		})
	}

	return nil
}
