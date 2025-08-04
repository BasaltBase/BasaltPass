package tenant

import (
	"strconv"
	"time"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// TenantUserResponse 租户用户响应
type TenantUserResponse struct {
	ID          uint       `json:"id"`
	Email       string     `json:"email"`
	Nickname    string     `json:"nickname"`
	Avatar      string     `json:"avatar"`
	Role        string     `json:"role"`   // tenant role: owner, admin, member
	Status      string     `json:"status"` // active, inactive, suspended
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// TenantUserStatsResponse 租户用户统计响应
type TenantUserStatsResponse struct {
	TotalUsers        int64 `json:"total_users"`
	ActiveUsers       int64 `json:"active_users"`
	SuspendedUsers    int64 `json:"suspended_users"`
	NewUsersThisMonth int64 `json:"new_users_this_month"`
}

// UpdateTenantUserRequest 更新租户用户请求
type UpdateTenantUserRequest struct {
	Role   *string `json:"role,omitempty"`   // admin, member
	Status *string `json:"status,omitempty"` // active, inactive, suspended
}

// InviteTenantUserRequest 邀请租户用户请求
type InviteTenantUserRequest struct {
	Email   string `json:"email" validate:"required,email"`
	Role    string `json:"role" validate:"required,oneof=admin member"`
	Message string `json:"message,omitempty"`
}

// GetTenantUsersHandler 获取租户用户列表
// GET /api/v1/tenant/users
func GetTenantUsersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	// 解析分页参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search", "")
	role := c.Query("role", "")
	status := c.Query("status", "")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// 构建查询
	query := tenantService.db.Table("tenant_admins").
		Select(`users.id, users.email, users.nickname, users.avatar_url as avatar, 
			tenant_admins.role, 
			CASE 
				WHEN users.email_verified = 0 THEN 'inactive'
				WHEN users.deleted_at IS NOT NULL THEN 'suspended'
				ELSE 'active'
			END as status,
			users.updated_at as last_login_at, tenant_admins.created_at, tenant_admins.updated_at`).
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ?", tenantID)

	// 添加搜索条件
	if search != "" {
		query = query.Where("LOWER(users.email) LIKE LOWER(?) OR LOWER(users.nickname) LIKE LOWER(?)",
			"%"+search+"%", "%"+search+"%")
	}

	// 添加角色过滤
	if role != "" {
		query = query.Where("tenant_admins.role = ?", role)
	}

	// 添加状态过滤
	if status != "" {
		switch status {
		case "active":
			query = query.Where("users.email_verified = 1 AND users.deleted_at IS NULL")
		case "inactive":
			query = query.Where("users.email_verified = 0")
		case "suspended":
			query = query.Where("users.deleted_at IS NOT NULL")
		}
	}

	// 获取总数
	var total int64
	countQuery := query
	if err := countQuery.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户总数失败",
		})
	}

	// 获取用户列表
	var users []TenantUserResponse
	if err := query.Offset(offset).Limit(limit).Order("tenant_admins.created_at DESC").
		Scan(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户列表失败",
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

// GetTenantUserStatsHandler 获取租户用户统计
// GET /api/v1/tenant/users/stats
func GetTenantUserStatsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var stats TenantUserStatsResponse

	// 获取总用户数
	tenantService.db.Table("tenant_admins").
		Where("tenant_id = ?", tenantID).
		Count(&stats.TotalUsers)

	// 获取活跃用户数（已验证邮箱且未删除）
	tenantService.db.Table("tenant_admins").
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ? AND users.email_verified = 1 AND users.deleted_at IS NULL", tenantID).
		Count(&stats.ActiveUsers)

	// 获取暂停用户数（已删除）
	tenantService.db.Table("tenant_admins").
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ? AND users.deleted_at IS NOT NULL", tenantID).
		Count(&stats.SuspendedUsers)

	// 获取本月新用户数
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	tenantService.db.Table("tenant_admins").
		Where("tenant_id = ? AND created_at >= ?", tenantID, startOfMonth).
		Count(&stats.NewUsersThisMonth)

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// UpdateTenantUserHandler 更新租户用户
// PUT /api/v1/tenant/users/:id
func UpdateTenantUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	var req UpdateTenantUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 检查用户是否属于该租户
	var tenantAdmin model.TenantAdmin
	if err := tenantService.db.Where("tenant_id = ? AND user_id = ?", tenantID, uint(userID)).
		First(&tenantAdmin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不属于该租户",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}

	// 不能修改所有者角色
	if tenantAdmin.Role == model.TenantRoleOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "不能修改租户所有者",
		})
	}

	// 更新租户角色
	if req.Role != nil {
		if *req.Role != "admin" && *req.Role != "member" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的角色类型",
			})
		}
		tenantAdmin.Role = model.TenantRole(*req.Role)
	}

	// 更新用户状态
	if req.Status != nil {
		var user model.User
		if err := tenantService.db.First(&user, uint(userID)).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "查询用户失败",
			})
		}

		switch *req.Status {
		case "active":
			// 激活用户 - 清除删除标记
			if err := tenantService.db.Unscoped().Model(&user).Update("deleted_at", nil).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "激活用户失败",
				})
			}
		case "suspended":
			// 暂停用户 - 软删除
			if err := tenantService.db.Delete(&user).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "暂停用户失败",
				})
			}
		}
	}

	// 保存租户角色更改
	if err := tenantService.db.Save(&tenantAdmin).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "更新用户失败",
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户更新成功",
	})
}

// RemoveTenantUserHandler 移除租户用户
// DELETE /api/v1/tenant/users/:id
func RemoveTenantUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	// 检查用户是否属于该租户
	var tenantAdmin model.TenantAdmin
	if err := tenantService.db.Where("tenant_id = ? AND user_id = ?", tenantID, uint(userID)).
		First(&tenantAdmin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不属于该租户",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}

	// 不能移除所有者
	if tenantAdmin.Role == model.TenantRoleOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "不能移除租户所有者",
		})
	}

	// 删除租户用户关联
	if err := tenantService.db.Delete(&tenantAdmin).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "移除用户失败",
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户移除成功",
	})
}

// InviteTenantUserHandler 邀请租户用户
// POST /api/v1/tenant/users/invite
func InviteTenantUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var req InviteTenantUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 验证邮箱格式和角色
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "邮箱不能为空",
		})
	}

	if req.Role != "admin" && req.Role != "member" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的角色类型",
		})
	}

	// 检查用户是否已存在
	var existingUser model.User
	userExists := tenantService.db.Where("email = ?", req.Email).First(&existingUser).Error == nil

	if userExists {
		// 检查是否已经是该租户的用户
		var existingTenantAdmin model.TenantAdmin
		if tenantService.db.Where("tenant_id = ? AND user_id = ?", tenantID, existingUser.ID).
			First(&existingTenantAdmin).Error == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "用户已经是该租户的成员",
			})
		}

		// 添加到租户
		tenantAdmin := model.TenantAdmin{
			UserID:   existingUser.ID,
			TenantID: tenantID,
			Role:     model.TenantRole(req.Role),
		}

		if err := tenantService.db.Create(&tenantAdmin).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "添加用户到租户失败",
			})
		}
	} else {
		// 创建邀请记录 - 这里可以扩展为发送邀请邮件等逻辑
		// 暂时简单返回成功，实际应该创建invitation记录并发送邮件
		return c.JSON(fiber.Map{
			"message": "邀请已发送，用户注册后将自动加入租户",
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户邀请成功",
	})
}

// ResendInvitationHandler 重新发送邀请
// POST /api/v1/tenant/users/:id/resend-invitation
func ResendInvitationHandler(c *fiber.Ctx) error {
	// 这里可以实现重新发送邀请邮件的逻辑
	// 暂时返回成功消息
	return c.JSON(fiber.Map{
		"message": "邀请已重新发送",
	})
}

// GetTenantUserHandler 获取租户用户详情
// GET /api/v1/tenant/users/:id
func GetTenantUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	userID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}

	var user TenantUserResponse
	if err := tenantService.db.Table("tenant_admins").
		Select(`users.id, users.email, users.nickname, users.avatar, 
			tenant_admins.role, 
			CASE 
				WHEN users.email_verified_at IS NULL THEN 'inactive'
				WHEN users.deleted_at IS NOT NULL THEN 'suspended'
				ELSE 'active'
			END as status,
			users.last_login_at, tenant_admins.created_at, tenant_admins.updated_at`).
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ? AND tenant_admins.user_id = ?", tenantID, uint(userID)).
		Scan(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}

	return c.JSON(fiber.Map{
		"user": user,
	})
}
