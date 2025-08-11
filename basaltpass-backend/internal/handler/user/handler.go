package user

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

var svc = Service{}

// GetProfileHandler handles GET /user/profile
func GetProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	profile, err := svc.GetProfile(uid)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(profile)
}

// DebugUserHandler 调试用户状态 - 临时调试端点
func DebugUserHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID")
	tid := c.Locals("tenantID")

	// 获取用户信息
	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.JSON(fiber.Map{
			"error":   "用户不存在",
			"user_id": uid,
		})
	}

	// 获取用户的租户关联
	var tenantAdmins []model.TenantAdmin
	common.DB().Preload("Tenant").Where("user_id = ?", uid).Find(&tenantAdmins)

	return c.JSON(fiber.Map{
		"user_id":   uid,
		"tenant_id": tid,
		"user": map[string]interface{}{
			"id":       user.ID,
			"email":    user.Email,
			"nickname": user.Nickname,
		},
		"tenant_associations": tenantAdmins,
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

	results, err := svc.SearchUsers(query, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(results)
}
