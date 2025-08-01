package rbac

import (
	"fmt"
	"strconv"

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

// CheckUserRoleHandler GET /admin/user/:userId/role/:roleId/check
func CheckUserRoleHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("roleId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	hasRole, err := HasRole(uint(userID), uint(roleID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"user_id":  userID,
		"role_id":  roleID,
		"has_role": hasRole,
	})
}

// CheckUserRoleByCodeHandler GET /admin/user/:userId/tenant/:tenantId/role/:roleCode/check
func CheckUserRoleByCodeHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	tenantID, err := strconv.ParseUint(c.Params("tenantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的租户ID"})
	}

	roleCode := c.Params("roleCode")
	if roleCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "角色代码不能为空"})
	}

	hasRole, err := HasRoleByCode(uint(userID), uint(tenantID), roleCode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"user_id":   userID,
		"tenant_id": tenantID,
		"role_code": roleCode,
		"has_role":  hasRole,
	})
}

// GetUserRolesHandler GET /admin/user/:userId/tenant/:tenantId/roles
func GetUserRolesHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	tenantID, err := strconv.ParseUint(c.Params("tenantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的租户ID"})
	}

	roles, err := GetUserRoles(uint(userID), uint(tenantID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"user_id":   userID,
		"tenant_id": tenantID,
		"roles":     roles,
	})
}

// RemoveUserRoleHandler DELETE /admin/user/:userId/role/:roleId
func RemoveUserRoleHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("roleId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	err = RemoveRole(uint(userID), uint(roleID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "角色移除成功"})
}
