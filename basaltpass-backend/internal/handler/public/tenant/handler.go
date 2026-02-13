package tenant

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

// GetTenantByCodeHandler 通过租户code获取租户公开信息
// GET /api/v1/public/tenants/by-code/:code
func GetTenantByCodeHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "tenant code is required",
		})
	}

	var tenant model.Tenant
	if err := common.DB().Where("code = ? AND status = ?", code, model.TenantStatusActive).
		Select("id", "name", "code", "description", "status", "plan").
		First(&tenant).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "tenant not found or inactive",
		})
	}

	return c.JSON(fiber.Map{
		"id":          tenant.ID,
		"name":        tenant.Name,
		"code":        tenant.Code,
		"description": tenant.Description,
		"status":      tenant.Status,
		"plan":        tenant.Plan,
	})
}
