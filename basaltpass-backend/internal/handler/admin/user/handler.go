package user

import (
	"basaltpass-backend/internal/common"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

var adminUserService *AdminUserService

func init() {
	adminUserService = NewAdminUserService(common.DB())
}

// ListUsersHandler 获取用户列表
// GET /tenant/users
func ListUsersHandler(c *fiber.Ctx) error {
	var req AdminUserListRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的查询参数",
		})
	}

	response, err := adminUserService.GetUserList(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// GetUserHandler 获取用户详情
// GET /tenant/users/:id
func GetUserHandler(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	response, err := adminUserService.GetUserDetail(uint(userID))
	if err != nil {
		if err.Error() == "用户不存在" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(response)
}

// UpdateUserHandler 更新用户信息
// PUT /tenant/users/:id
func UpdateUserHandler(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	var req UpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的请求数据",
		})
	}

	err = adminUserService.UpdateUser(uint(userID), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户信息更新成功",
	})
}

// BanUserHandler 封禁/解封用户
// POST /tenant/users/:id/ban
func BanUserHandler(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	var req BanUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的请求数据",
		})
	}

	err = adminUserService.BanUser(uint(userID), req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	action := "解封"
	if req.Banned {
		action = "封禁"
	}

	return c.JSON(fiber.Map{
		"message": "用户" + action + "成功",
	})
}

// DeleteUserHandler 删除用户
// DELETE /tenant/users/:id
func DeleteUserHandler(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	err = adminUserService.DeleteUser(uint(userID))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户删除成功",
	})
}

// GetUserStatsHandler 获取用户统计数据
// GET /tenant/users/stats
func GetUserStatsHandler(c *fiber.Ctx) error {
	stats, err := adminUserService.GetUserStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(stats)
}

// AssignGlobalRoleHandler 分配全局角色
// POST /tenant/users/:id/roles
func AssignGlobalRoleHandler(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	var req AssignGlobalRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的请求数据",
		})
	}

	err = adminUserService.AssignGlobalRole(uint(userID), req.RoleID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "角色分配成功",
	})
}

// RemoveGlobalRoleHandler 移除全局角色
// DELETE /tenant/users/:id/roles/:role_id
func RemoveGlobalRoleHandler(c *fiber.Ctx) error {
	userIDStr := c.Params("id")
	userID, err := strconv.ParseUint(userIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	roleIDStr := c.Params("role_id")
	roleID, err := strconv.ParseUint(roleIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的角色ID",
		})
	}

	err = adminUserService.RemoveGlobalRole(uint(userID), uint(roleID))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "角色移除成功",
	})
}

// CreateUserHandler 创建新用户
// POST /tenant/users
func CreateUserHandler(c *fiber.Ctx) error {
	var req AdminCreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的请求数据",
		})
	}

	user, err := adminUserService.CreateUser(req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// 返回创建的用户信息，但不包含密码哈希
	response := AdminUserListResponse{
		ID:            user.ID,
		Email:         user.Email,
		Phone:         user.Phone,
		Nickname:      user.Nickname,
		AvatarURL:     user.AvatarURL,
		EmailVerified: user.EmailVerified,
		PhoneVerified: user.PhoneVerified,
		TwoFAEnabled:  user.TwoFAEnabled,
		Banned:        user.Banned,
		CreatedAt:     user.CreatedAt,
		UpdatedAt:     user.UpdatedAt,
	}

	return c.Status(fiber.StatusCreated).JSON(response)
}
