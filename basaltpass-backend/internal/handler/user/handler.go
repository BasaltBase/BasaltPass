package user

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	tenant2 "basaltpass-backend/internal/service/tenant"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

var svc = Service{}
var tenantSvc = tenant2.NewTenantService()

// GetProfileHandler handles GET /user/profile
func GetProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	profile, err := svc.GetProfile(uid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(profile)
}

// GetUserTenantsHandler 获取用户的租户列表
// GET /user/tenants
func GetUserTenantsHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	tenants, err := tenantSvc.GetUserTenants(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": tenants,
	})
}

// UpdateProfileHandler handles PUT /user/profile
func UpdateProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var req UpdateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := svc.UpdateProfile(uid, req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// SearchHandler handles GET /users/search
func SearchHandler(c *fiber.Ctx) error {
	query := c.Query("q")
	if query == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "search query is required"})
	}

	limitStr := c.Query("limit", "10")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}

	// 获取当前用户的tenant_id
	var tenantID uint
	if tid, ok := c.Locals("tenantID").(uint); ok {
		tenantID = tid
	} else {
		// 如果没有tenantID，从用户记录获取
		userID := c.Locals("userID").(uint)
		var user model.User
		if err := common.DB().Select("tenant_id").First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get user tenant"})
		}
		tenantID = user.TenantID
	}

	results, err := svc.SearchUsers(query, limit, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(results)
}
