package rbac

import (
	"fmt"

	"github.com/gofiber/fiber/v2"
)

// ListRolesHandler GET /admin/roles
func ListRolesHandler(c *fiber.Ctx) error {
	roles, err := ListRoles()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(roles)
}

// CreateRoleHandler POST /admin/roles
func CreateRoleHandler(c *fiber.Ctx) error {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := CreateRole(body.Name, body.Description); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

// AssignRoleHandler POST /admin/user/:id/role
func AssignRoleHandler(c *fiber.Ctx) error {
	userIDParam := c.Params("id")
	var body struct {
		RoleID uint `json:"role_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var userID uint
	fmt.Sscan(userIDParam, &userID)
	if err := AssignRole(userID, body.RoleID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
