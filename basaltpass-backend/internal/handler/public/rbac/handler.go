package rbac

import (
	rbac2 "basaltpass-backend/internal/service/rbac"
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// ListRolesHandler GET /tenant/roles
func ListRolesHandler(c *fiber.Ctx) error {
	roles, err := rbac2.ListRoles()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(roles)
}

// CreateRoleHandler POST /tenant/roles
func CreateRoleHandler(c *fiber.Ctx) error {
	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := rbac2.CreateRole(body.Name, body.Description); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

// AssignRoleHandler POST /tenant/user/:id/role
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
	if err := rbac2.AssignRole(userID, body.RoleID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// CheckUserRoleHandler GET /tenant/user/:userId/role/:roleId/check
func CheckUserRoleHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("roleId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	hasRole, err := rbac2.HasRole(uint(userID), uint(roleID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"user_id":  userID,
		"role_id":  roleID,
		"has_role": hasRole,
	})
}

// CheckUserRoleByCodeHandler GET /tenant/user/:userId/tenant/:tenantId/role/:roleCode/check
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

	hasRole, err := rbac2.HasRoleByCode(uint(userID), uint(tenantID), roleCode)
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

// GetUserRolesHandler GET /tenant/user/:userId/tenant/:tenantId/roles
func GetUserRolesHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	tenantID, err := strconv.ParseUint(c.Params("tenantId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的租户ID"})
	}

	roles, err := rbac2.GetUserRoles(uint(userID), uint(tenantID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"user_id":   userID,
		"tenant_id": tenantID,
		"roles":     roles,
	})
}

// RemoveUserRoleHandler DELETE /tenant/user/:userId/role/:roleId
func RemoveUserRoleHandler(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("userId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	roleID, err := strconv.ParseUint(c.Params("roleId"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	err = rbac2.RemoveRole(uint(userID), uint(roleID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "角色移除成功"})
}
