package rbac

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

type createPermissionReq struct {
	Code string `json:"code"`
	Desc string `json:"desc"`
}

// ListPermissionsHandler GET /tenant/permissions
func ListPermissionsHandler(c *fiber.Ctx) error {
	var perms []model.Permission
	if err := common.DB().Order("code asc").Find(&perms).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(perms)
}

// CreatePermissionHandler POST /tenant/permissions
func CreatePermissionHandler(c *fiber.Ctx) error {
	var req createPermissionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "code 不能为空"})
	}
	perm := model.Permission{Code: req.Code, Desc: req.Desc}
	if err := common.DB().Create(&perm).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(perm)
}

// UpdatePermissionHandler PUT /tenant/permissions/:id
func UpdatePermissionHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	var perm model.Permission
	if err := common.DB().First(&perm, id).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "权限不存在"})
	}
	var req createPermissionReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.Code != "" {
		perm.Code = req.Code
	}
	perm.Desc = req.Desc
	if err := common.DB().Save(&perm).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(perm)
}

// DeletePermissionHandler DELETE /tenant/permissions/:id
func DeletePermissionHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	tx := common.DB().Begin()
	if err := tx.Where("permission_id = ?", id).Delete(&model.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if err := tx.Delete(&model.Permission{}, id).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	tx.Commit()
	return c.SendStatus(fiber.StatusNoContent)
}

// GetRolePermissionsHandler GET /tenant/roles/:id/permissions
func GetRolePermissionsHandler(c *fiber.Ctx) error {
	roleID := c.Params("id")
	var permissions []model.Permission
	err := common.DB().Table("permissions").
		Joins("JOIN role_permissions ON role_permissions.permission_id = permissions.id").
		Where("role_permissions.role_id = ?", roleID).
		Find(&permissions).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(permissions)
}

type setRolePermissionsReq struct {
	PermissionIDs []uint `json:"permission_ids"`
}

// SetRolePermissionsHandler POST /tenant/roles/:id/permissions
// Replace role's permissions with provided list.
func SetRolePermissionsHandler(c *fiber.Ctx) error {
	roleID := c.Params("id")
	var req setRolePermissionsReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	tx := common.DB().Begin()
	if err := tx.Where("role_id = ?", roleID).Delete(&model.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	for _, pid := range req.PermissionIDs {
		if err := tx.Exec("INSERT INTO role_permissions(role_id, permission_id) VALUES(?, ?)", roleID, pid).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	}
	tx.Commit()
	return c.JSON(fiber.Map{"message": "权限已更新"})
}

// RemoveRolePermissionHandler DELETE /tenant/roles/:id/permissions/:permission_id
func RemoveRolePermissionHandler(c *fiber.Ctx) error {
	roleID := c.Params("id")
	permID := c.Params("permission_id")
	if err := common.DB().Where("role_id = ? AND permission_id = ?", roleID, permID).Delete(&model.RolePermission{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
