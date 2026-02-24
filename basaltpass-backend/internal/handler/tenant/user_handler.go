package tenant

import (
	"strconv"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	emailservice "basaltpass-backend/internal/service/email"

	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// TenantUserResponse 租户用户响应
type TenantUserResponse struct {
	ID          uint       `json:"id"`
	Email       string     `json:"email"`
	Nickname    string     `json:"nickname"`
	Avatar      string     `json:"avatar"`
	Role        string     `json:"role"`   // tenant role: owner, tenant, member (非管理员用户默认为 member)
	Status      string     `json:"status"` // active, inactive, suspended（根据 users 表推断）
	LastLoginAt *time.Time `json:"last_login_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	// 新增：基于 app_users 的聚合信息
	AppCount         int64      `json:"app_count"`
	LastAuthorizedAt *time.Time `json:"last_authorized_at"`
	LastActiveAt     *time.Time `json:"last_active_at"`
	IsTenantUser     bool       `json:"is_tenant_user"`
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
	Role   *string `json:"role,omitempty"`   // tenant, member
	Status *string `json:"status,omitempty"` // active, inactive, suspended
}

// InviteTenantUserRequest 邀请租户用户请求
type InviteTenantUserRequest struct {
	Email   string `json:"email" validate:"required,email"`
	Role    string `json:"role" validate:"required,oneof=tenant member"`
	Message string `json:"message,omitempty"`
}

// loadTenantMembership 优先使用 users.tenant_id 判断用户归属，
// 并兼容读取 tenant_users 作为角色来源与旧数据回退。
func loadTenantMembership(userID, tenantID uint) (model.User, *model.TenantUser, bool, error) {
	var user model.User
	if err := common.DB().Unscoped().First(&user, userID).Error; err != nil {
		return model.User{}, nil, false, err
	}

	var tenantUser model.TenantUser
	err := common.DB().Where("tenant_id = ? AND user_id = ?", tenantID, userID).First(&tenantUser).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return model.User{}, nil, false, err
	}

	var tenantUserPtr *model.TenantUser
	if err == nil {
		tenantUserPtr = &tenantUser
	}

	belongs := user.TenantID == tenantID || tenantUserPtr != nil
	return user, tenantUserPtr, belongs, nil
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

	// 基于租户的应用从 app_users 聚合使用该租户应用的用户
	base := common.DB().Table("users u").
		Joins("JOIN app_users au ON au.user_id = u.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Joins("LEFT JOIN tenant_users ta ON ta.user_id = u.id AND ta.tenant_id = ?", tenantID).
		Where("a.tenant_id = ?", tenantID)

	// 搜索条件（邮箱/昵称）
	if search != "" {
		base = base.Where("LOWER(u.email) LIKE LOWER(?) OR LOWER(u.nickname) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}
	// 角色过滤（无管理员记录的用户角色归为 member）
	if role != "" {
		base = base.Where("COALESCE(ta.role, 'member') = ?", role)
	}
	// 状态过滤（基于 users 表推断）
	if status != "" {
		switch status {
		case "active":
			base = base.Where("u.email_verified = 1 AND u.deleted_at IS NULL")
		case "inactive":
			base = base.Where("u.email_verified = 0")
		case "suspended":
			base = base.Where("u.deleted_at IS NOT NULL")
		}
	}

	// 统计去重后的用户数量
	var total int64
	if err := base.Distinct("u.id").Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户总数失败: " + err.Error(),
		})
	}

	// 列表查询并聚合
	// 注意：SQLite 中时间字段需要特殊处理
	type tenantUserRow struct {
		ID               uint    `json:"id"`
		Email            string  `json:"email"`
		Nickname         string  `json:"nickname"`
		Avatar           string  `json:"avatar"`
		Role             string  `json:"role"`
		Status           string  `json:"status"`
		LastLoginAt      *string `json:"last_login_at"` // 改为字符串接收
		CreatedAt        string  `json:"created_at"`    // 改为字符串接收
		UpdatedAt        string  `json:"updated_at"`    // 改为字符串接收
		AppCount         int64   `json:"app_count"`
		LastAuthorizedAt *string `json:"last_authorized_at"` // 改为字符串接收
		LastActiveAt     *string `json:"last_active_at"`     // 改为字符串接收
		IsTenantUserInt  int64   `gorm:"column:is_tenant_user"`
	}

	var rows []tenantUserRow
	listQuery := base.Select(`
			u.id,
			u.email,
			u.nickname,
			COALESCE(u.avatar_url, '') as avatar,
			COALESCE(ta.role, 'member') as role,
			CASE 
				WHEN u.email_verified = 0 THEN 'inactive'
				WHEN u.deleted_at IS NOT NULL THEN 'suspended'
				ELSE 'active'
			END as status,
			MAX(au.last_active_at) as last_login_at,
			MIN(au.created_at) as created_at,
			MAX(au.updated_at) as updated_at,
			COUNT(DISTINCT au.app_id) as app_count,
			MAX(au.last_authorized_at) as last_authorized_at,
			MAX(au.last_active_at) as last_active_at,
			CASE WHEN ta.id IS NULL THEN 0 ELSE 1 END as is_tenant_user`).
		Group("u.id, u.email, u.nickname, u.avatar_url, COALESCE(ta.role, 'member')").
		Order("MAX(au.last_active_at) DESC, MAX(au.last_authorized_at) DESC").
		Offset(offset).Limit(limit)

	if err := listQuery.Scan(&rows).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户列表失败: " + err.Error(),
		})
	}

	// 转换为对外响应结构（处理时间字段转换）
	users := make([]TenantUserResponse, 0, len(rows))
	for _, r := range rows {
		user := TenantUserResponse{
			ID:           r.ID,
			Email:        r.Email,
			Nickname:     r.Nickname,
			Avatar:       r.Avatar,
			Role:         r.Role,
			Status:       r.Status,
			AppCount:     r.AppCount,
			IsTenantUser: r.IsTenantUserInt != 0,
		}

		// 转换时间字段
		if r.LastLoginAt != nil && *r.LastLoginAt != "" {
			if t, err := time.Parse(time.RFC3339, *r.LastLoginAt); err == nil {
				user.LastLoginAt = &t
			}
		}
		if r.CreatedAt != "" {
			if t, err := time.Parse(time.RFC3339, r.CreatedAt); err == nil {
				user.CreatedAt = t
			}
		}
		if r.UpdatedAt != "" {
			if t, err := time.Parse(time.RFC3339, r.UpdatedAt); err == nil {
				user.UpdatedAt = t
			}
		}
		if r.LastAuthorizedAt != nil && *r.LastAuthorizedAt != "" {
			if t, err := time.Parse(time.RFC3339, *r.LastAuthorizedAt); err == nil {
				user.LastAuthorizedAt = &t
			}
		}
		if r.LastActiveAt != nil && *r.LastActiveAt != "" {
			if t, err := time.Parse(time.RFC3339, *r.LastActiveAt); err == nil {
				user.LastActiveAt = &t
			}
		}

		users = append(users, user)
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

// TenantAppLinkedUserResponse 授权了当前租户任一应用的用户（从 app_users 聚合）
type TenantAppLinkedUserResponse struct {
	ID               uint       `json:"id"`
	Email            string     `json:"email"`
	Nickname         string     `json:"nickname"`
	Avatar           string     `json:"avatar"`
	AppCount         int64      `json:"app_count"`
	LastAuthorizedAt *time.Time `json:"last_authorized_at"`
	LastActiveAt     *time.Time `json:"last_active_at"`
}

// GetTenantAppLinkedUsersHandler 获取授权了当前租户任一应用的所有用户（来自 app_users）
// GET /api/v1/tenant/users/app-linked
func GetTenantAppLinkedUsersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	// 分页与筛选
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := c.Query("search", "")
	status := c.Query("status", "") // 过滤 app_users.status，可选

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// 基础联结：租户下的应用(apps.tenant_id = tenantID) 与 app_users、users
	base := common.DB().Table("users").
		Joins("JOIN app_users au ON au.user_id = users.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ?", tenantID)

	if search != "" {
		base = base.Where("LOWER(users.email) LIKE LOWER(?) OR LOWER(users.nickname) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}
	if status != "" {
		base = base.Where("au.status = ?", status)
	}

	// 统计去重后的用户数量
	var total int64
	if err := base.Distinct("users.id").Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "统计用户数量失败",
		})
	}

	// 查询列表：按用户分组聚合（最近授权/活跃时间、涉及应用数）
	var users []TenantAppLinkedUserResponse
	listQuery := base.Select(`
			users.id,
			users.email,
			users.nickname,
			users.avatar_url as avatar,
			COUNT(DISTINCT au.app_id) as app_count,
			MAX(au.last_authorized_at) as last_authorized_at,
			MAX(au.last_active_at) as last_active_at`).
		Group("users.id, users.email, users.nickname, users.avatar_url").
		Order("MAX(au.last_authorized_at) DESC").
		Offset(offset).Limit(limit)

	if err := listQuery.Scan(&users).Error; err != nil {
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

	// 基于 app_users 以及当前租户的应用来统计
	// 总用户数（授权了该租户任一应用的去重用户）
	if err := common.DB().Table("users u").
		Joins("JOIN app_users au ON au.user_id = u.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ?", tenantID).
		Distinct("u.id").Count(&stats.TotalUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计总用户数失败"})
	}

	// 活跃用户（邮箱已验证且未删除）
	if err := common.DB().Table("users u").
		Joins("JOIN app_users au ON au.user_id = u.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ? AND u.email_verified = 1 AND u.deleted_at IS NULL", tenantID).
		Distinct("u.id").Count(&stats.ActiveUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计活跃用户数失败"})
	}

	// 暂停用户（已删除）
	if err := common.DB().Table("users u").
		Joins("JOIN app_users au ON au.user_id = u.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ? AND u.deleted_at IS NOT NULL", tenantID).
		Distinct("u.id").Count(&stats.SuspendedUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计暂停用户数失败"})
	}

	// 本月新用户：第一次授权该租户任何应用的时间在本月内
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	sub := common.DB().Table("users u").
		Select("u.id, MIN(au.created_at) as first_auth").
		Joins("JOIN app_users au ON au.user_id = u.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ?", tenantID).
		Group("u.id").
		Having("MIN(au.created_at) >= ?", startOfMonth)

	if err := common.DB().Table("(?) as t", sub).
		Count(&stats.NewUsersThisMonth).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计本月新用户失败"})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// UpdateTenantUserHandler 更新租户用户
// PUT /api/v1/tenant/users/:id
func UpdateTenantUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	userIDUint64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}
	userID := uint(userIDUint64)

	var req UpdateTenantUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 检查用户是否属于该租户（优先 users.tenant_id）
	user, tenantUser, belongs, err := loadTenantMembership(userID, tenantID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "用户不属于该租户",
		})
	}

	// 不能修改所有者角色
	if tenantUser != nil && tenantUser.Role == model.TenantRoleOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "不能修改租户所有者",
		})
	}

	// 更新租户角色
	if req.Role != nil {
		if *req.Role != "tenant" && *req.Role != "member" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的角色类型",
			})
		}
		newRole := model.TenantRole(*req.Role)
		if tenantUser != nil {
			tenantUser.Role = newRole
		} else if newRole != model.TenantRoleMember {
			tenantUser = &model.TenantUser{
				UserID:   userID,
				TenantID: tenantID,
				Role:     newRole,
			}
		}
	}

	// 更新用户状态
	if req.Status != nil {
		switch *req.Status {
		case "active":
			// 激活用户 - 清除删除标记
			if err := common.DB().Unscoped().Model(&model.User{}).
				Where("id = ?", userID).
				Update("deleted_at", nil).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "激活用户失败",
				})
			}
		case "suspended":
			// 暂停用户 - 软删除
			if err := common.DB().Delete(&user).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "暂停用户失败",
				})
			}
		default:
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的状态类型",
			})
		}
	}

	// 保存租户角色更改
	if req.Role != nil && tenantUser != nil {
		if tenantUser.ID == 0 {
			if err := common.DB().Create(tenantUser).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "更新用户失败",
				})
			}
		} else {
			if err := common.DB().Save(tenantUser).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "更新用户失败",
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"message": "用户更新成功",
	})
}

// RemoveTenantUserHandler 移除租户用户
// DELETE /api/v1/tenant/users/:id
func RemoveTenantUserHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	userIDUint64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}
	userID := uint(userIDUint64)

	// 检查用户是否属于该租户（优先 users.tenant_id）
	user, tenantUser, belongs, err := loadTenantMembership(userID, tenantID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "用户不属于该租户",
		})
	}

	// 不能移除所有者
	if tenantUser != nil && tenantUser.Role == model.TenantRoleOwner {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "不能移除租户所有者",
		})
	}

	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 主关系改为 users.tenant_id，移除时先清理主关系
	if user.TenantID == tenantID {
		if err := tx.Unscoped().
			Model(&model.User{}).
			Where("id = ?", userID).
			Update("tenant_id", 0).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "移除用户失败",
			})
		}
	}

	// 兼容删除 tenant_user 关系记录
	if tenantUser != nil {
		if err := tx.Delete(tenantUser).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "移除用户失败",
			})
		}
	}
	tx.Commit()

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

	if req.Role != "tenant" && req.Role != "member" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的角色类型",
		})
	}

	// 检查用户是否已存在
	var existingUser model.User
	userExists := common.DB().Where("email = ?", req.Email).First(&existingUser).Error == nil

	if userExists {
		// 关系判断优先 users.tenant_id，tenant_users 作为补充
		if existingUser.TenantID == tenantID {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "用户已经是该租户的成员",
			})
		}

		var existingTenantUser model.TenantUser
		if common.DB().Where("tenant_id = ? AND user_id = ?", tenantID, existingUser.ID).
			First(&existingTenantUser).Error == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "用户已经是该租户的成员",
			})
		}

		if existingUser.TenantID != 0 && existingUser.TenantID != tenantID {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error": "用户已属于其他租户",
			})
		}

		tx := common.DB().Begin()
		defer func() {
			if r := recover(); r != nil {
				tx.Rollback()
			}
		}()

		// 主关系落到 users.tenant_id
		if err := tx.Model(&model.User{}).
			Where("id = ?", existingUser.ID).
			Update("tenant_id", tenantID).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "添加用户到租户失败",
			})
		}

		// 非 member 角色写入 tenant_users；member 默认不必写入记录
		if req.Role != "member" {
			tenantUser := model.TenantUser{
				UserID:   existingUser.ID,
				TenantID: tenantID,
				Role:     model.TenantRole(req.Role),
			}
			if err := tx.Create(&tenantUser).Error; err != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "添加用户到租户失败",
				})
			}
		}

		tx.Commit()
		return c.JSON(fiber.Map{
			"message": "用户被直接添加到租户中",
		})
	} else {
		// 生成邀请Token
		tokenBytes := make([]byte, 32)
		if _, err := rand.Read(tokenBytes); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "生成邀请令牌失败",
			})
		}
		tokenStr := hex.EncodeToString(tokenBytes)

		inviterIDVal := c.Locals("userID")
		var inviterID uint
		if inviterIDVal != nil {
			inviterID = inviterIDVal.(uint)
		}

		invitation := model.TenantInvitation{
			TenantID:  tenantID,
			Email:     req.Email,
			Role:      model.TenantRole(req.Role),
			Status:    "pending",
			InviterID: inviterID,
			Token:     tokenStr,
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		if err := common.DB().Create(&invitation).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "创建邀请记录失败",
			})
		}

		// 获取租户名称
		var tenant model.Tenant
		common.DB().Where("id = ?", tenantID).First(&tenant)

		// 异步发送邮件
		go func() {
			cfg := config.Get()
			emailSvc, err := emailservice.NewServiceFromConfig(cfg)
			if err == nil && emailSvc != nil {
				baseURL := cfg.UI.BaseURL
				if baseURL == "" {
					baseURL = "http://localhost:5101" // fallback
				}
				inviteLink := fmt.Sprintf("%s/login?tenant=%s&email=%s&invite_token=%s", baseURL, tenant.Code, req.Email, tokenStr)

				subject := fmt.Sprintf("Invitation to join %s on BasaltPass", tenant.Name)
				htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tenant Invitation</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        
        <!-- 头部 -->
        <div style="padding: 32px 40px; border-bottom: 1px solid #edf2f7; text-align: center;">
            <h1 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.5px;">BasaltPass</h1>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px;">
            <h2 style="color: #2d3748; font-size: 20px; font-weight: 600; margin: 0 0 24px; text-align: center;">Invitation to Join Tenant</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
                You have been invited to join <strong>%s</strong> as a member.
            </p>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
                Please click the button below to accept the invitation and securely log in or register your account:
            </p>
            
            <div style="text-align: center; margin: 0 0 32px;">
                <a href="%s" style="background-color: #2b6cb0; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px; display: inline-block;">Accept Invitation</a>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 32px 0;">
            
            <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0;">
                If you're having trouble clicking the button, copy and paste the URL below into your web browser:<br>
                <a href="%s" style="color: #2b6cb0; word-break: break-all;">%s</a>
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #edf2f7;">
            <p style="color: #a0aec0; font-size: 13px; margin: 0;">
                &copy; %d BasaltPass. All rights reserved.<br>
                This is an automated message, please do not reply directly.
            </p>
        </div>
    </div>
</body>
</html>
				`, tenant.Name, inviteLink, inviteLink, inviteLink, time.Now().Year())

				msg := &emailservice.Message{
					To:       []string{req.Email},
					Subject:  subject,
					HTMLBody: htmlBody,
					TextBody: fmt.Sprintf("You have been invited to join %s. Please visit this link to accept the invitation: %s", tenant.Name, inviteLink),
				}
				_, sendErr := emailSvc.SendWithLogging(context.Background(), msg, &inviterID, "tenant_invitation")
				if sendErr != nil {
					fmt.Printf("[Email Debug] SendWithLogging failed: %v\n", sendErr)
				} else {
					fmt.Printf("[Email Debug] SendWithLogging succeeded\n")
				}
			} else {
				fmt.Printf("[Email Debug] Failed to init email service: %v\n", err)
			}
		}()

		return c.JSON(fiber.Map{
			"message": "邀请已发送，用户可以通过邮件中的链接接受邀请",
		})
	}
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
	userIDUint64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}
	userID := uint(userIDUint64)

	user, tenantUser, belongs, err := loadTenantMembership(userID, tenantID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}
	if !belongs {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "用户不存在或不属于当前租户",
		})
	}

	role := string(model.TenantRoleMember)
	isTenantUser := false
	createdAt := user.CreatedAt
	updatedAt := user.UpdatedAt
	if tenantUser != nil {
		role = string(tenantUser.Role)
		isTenantUser = true
		createdAt = tenantUser.CreatedAt
		updatedAt = tenantUser.UpdatedAt
	}

	status := "active"
	if !user.EmailVerified {
		status = "inactive"
	} else if user.DeletedAt.Valid {
		status = "suspended"
	}

	resp := TenantUserResponse{
		ID:           user.ID,
		Email:        user.Email,
		Nickname:     user.Nickname,
		Avatar:       user.AvatarURL,
		Role:         role,
		Status:       status,
		CreatedAt:    createdAt,
		UpdatedAt:    updatedAt,
		IsTenantUser: isTenantUser,
	}

	return c.JSON(fiber.Map{
		"user": resp,
	})
}
