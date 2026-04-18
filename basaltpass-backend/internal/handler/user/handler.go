package user

import (
	"basaltpass-backend/internal/common"
	userdto "basaltpass-backend/internal/dto/user"
	"basaltpass-backend/internal/model"
	tenant2 "basaltpass-backend/internal/service/tenant"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

var svc = Service{}
var tenantSvc = tenant2.NewTenantService()

// GetProfileHandler handles GET /user/profile
func GetProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var activeTenantID uint
	if tid, ok := c.Locals("tenantID").(uint); ok {
		activeTenantID = tid
	}
	profile, err := svc.GetProfile(uid, activeTenantID)
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

// JoinTenantByCodeHandler allows a logged-in user to join a tenant via tenant code.
// POST /user/tenants/join-by-code/:code
func JoinTenantByCodeHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)
	tenantCode := strings.TrimSpace(c.Params("code"))
	if tenantCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "tenant code is required",
		})
	}

	db := common.DB()

	var user model.User
	if err := db.Select("id", "tenant_id", "is_system_admin").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load user"})
	}

	if user.IsSuperAdmin() {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "system admin cannot join tenant via join link",
		})
	}

	var tenant model.Tenant
	if err := db.Where("code = ? AND status = ?", tenantCode, model.TenantStatusActive).
		Select("id", "name", "code", "status").
		First(&tenant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "tenant not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load tenant"})
	}

	if user.TenantID != 0 && user.TenantID != tenant.ID {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "user already belongs to another tenant",
		})
	}

	tx := db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	joinedNow := false
	var membership model.TenantUser
	err := tx.Where("tenant_id = ? AND user_id = ?", tenant.ID, user.ID).First(&membership).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join tenant"})
		}

		membership = model.TenantUser{
			TenantID: tenant.ID,
			UserID:   user.ID,
			Role:     model.TenantRoleMember,
		}
		if err := tx.Create(&membership).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join tenant"})
		}
		joinedNow = true
	}

	if user.TenantID == 0 {
		if err := tx.Model(&model.User{}).Where("id = ?", user.ID).Update("tenant_id", tenant.ID).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join tenant"})
		}
		joinedNow = true
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to join tenant"})
	}

	return c.JSON(fiber.Map{
		"message":      "joined tenant successfully",
		"joined":       joinedNow,
		"already_joined": !joinedNow,
		"tenant": fiber.Map{
			"id":   tenant.ID,
			"name": tenant.Name,
			"code": tenant.Code,
		},
	})
}

// UpdateProfileHandler handles PUT /user/profile
func UpdateProfileHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var req userdto.UpdateProfileRequest
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
