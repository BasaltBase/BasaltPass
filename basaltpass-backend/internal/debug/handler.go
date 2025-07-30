package debug

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

// CheckUserTenantHandler 检查用户租户状态
// GET /api/v1/debug/user-tenant
func CheckUserTenantHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	db := common.DB()

	// 获取用户信息
	var user model.User
	if err := db.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	// 获取用户的租户关联
	var tenantAdmins []model.TenantAdmin
	db.Where("user_id = ?", userID).Preload("Tenant").Find(&tenantAdmins)

	// 获取所有租户
	var tenants []model.Tenant
	db.Find(&tenants)

	return c.JSON(fiber.Map{
		"user_id":       userID,
		"user":          user,
		"tenant_admins": tenantAdmins,
		"all_tenants":   tenants,
	})
}
