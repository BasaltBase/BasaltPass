package app_user

import (
	"basaltpass-backend/internal/common"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

var appUserService *AppUserService

func init() {
	appUserService = NewAppUserService(common.DB())
}

// GetAppUsersHandler 获取应用的用户列表（租户管理员权限）
func GetAppUsersHandler(c *fiber.Ctx) error {
	// 获取应用ID
	appIDStr := c.Params("app_id")
	appID, err := strconv.ParseUint(appIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid app ID",
		})
	}

	// 分页参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	users, total, err := appUserService.GetAppUsers(uint(appID), page, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get app users",
		})
	}

	return c.JSON(fiber.Map{
		"users": users,
		"pagination": fiber.Map{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetUserAppsHandler 获取用户授权的应用列表（用户自己查看）
func GetUserAppsHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	apps, err := appUserService.GetUserApps(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get user apps",
		})
	}

	return c.JSON(fiber.Map{
		"apps": apps,
	})
}

// RevokeUserAppHandler 撤销用户对应用的授权（用户自己操作）
func RevokeUserAppHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	appIDStr := c.Params("app_id")
	appID, err := strconv.ParseUint(appIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid app ID",
		})
	}

	if err := appUserService.RevokeUserAppAuthorization(uint(appID), userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to revoke authorization",
		})
	}

	// 记录审计日志
	common.LogAudit(userID, "撤销应用授权", "app_user", strconv.Itoa(int(appID)), "", "")

	return c.JSON(fiber.Map{
		"message": "Authorization revoked successfully",
	})
}

// GetAppUserStatsHandler 获取应用用户统计（租户管理员权限）
func GetAppUserStatsHandler(c *fiber.Ctx) error {
	appIDStr := c.Params("app_id")
	appID, err := strconv.ParseUint(appIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid app ID",
		})
	}

	stats, err := appUserService.GetAppUserStats(uint(appID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get app user stats",
		})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// AdminRevokeUserAppHandler 管理员撤销用户对应用的授权（租户管理员权限）
func AdminRevokeUserAppHandler(c *fiber.Ctx) error {
	adminUserID := c.Locals("userID").(uint)

	appIDStr := c.Params("app_id")
	appID, err := strconv.ParseUint(appIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid app ID",
		})
	}

	userIDStr := c.Params("user_id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	if err := appUserService.RevokeUserAppAuthorization(uint(appID), uint(userID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to revoke authorization",
		})
	}

	// 记录审计日志
	common.LogAudit(adminUserID, "管理员撤销应用授权", "app_user",
		strconv.Itoa(int(appID))+"_"+strconv.Itoa(int(userID)), "", "")

	return c.JSON(fiber.Map{
		"message": "Authorization revoked successfully",
	})
}
