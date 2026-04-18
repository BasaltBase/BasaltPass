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
	"log"
	"net/url"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// TenantUserResponse 租户用户响应
type TenantUserResponse struct {
	ID          uint       `json:"id"`
	Email       string     `json:"email"`
	Nickname    string     `json:"nickname"`
	Avatar      string     `json:"avatar"`
	Role        string     `json:"role"`   // tenant role: owner, admin, user, baned (非管理员用户默认为 user)
	Status      string     `json:"status"` // active, inactive, suspended（只看 users 表，或者看 tenant_users 里的 baned）
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
	Role   *string `json:"role,omitempty"`   // admin, user, baned
	Status *string `json:"status,omitempty"` // active, inactive, suspended
}

// InviteTenantUserRequest 邀请租户用户请求
type InviteTenantUserRequest struct {
	Email   string `json:"email" validate:"required,email"`
	Role    string `json:"role" validate:"required,oneof=admin user member"`
	Message string `json:"message,omitempty"`
}

// GlobalUserCandidateResponse 全局用户候选响应
type GlobalUserCandidateResponse struct {
	ID        uint      `json:"id"`
	Email     string    `json:"email"`
	Nickname  string    `json:"nickname"`
	Avatar    string    `json:"avatar"`
	CreatedAt time.Time `json:"created_at"`
}

// AuthorizeGlobalUserRequest 授权全局用户加入当前租户
type AuthorizeGlobalUserRequest struct {
	Role string `json:"role,omitempty"`
}

func normalizeTenantInviteRole(raw string) (model.TenantRole, string, bool) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case string(model.TenantRoleAdmin):
		return model.TenantRoleAdmin, "管理员", true
	case string(model.TenantRoleMember), string(model.TenantRoleUser), "":
		return model.TenantRoleMember, "成员", true
	default:
		return "", "", false
	}
}

func resolveTenantInviteBaseURL(originHeader, refererHeader string, cfg *config.Config) string {
	if origin := strings.TrimSpace(originHeader); origin != "" {
		return strings.TrimRight(origin, "/")
	}
	if referer := strings.TrimSpace(refererHeader); referer != "" {
		if parsed, err := url.Parse(referer); err == nil && parsed.Scheme != "" && parsed.Host != "" {
			return strings.TrimRight(parsed.Scheme+"://"+parsed.Host, "/")
		}
	}
	if cfg != nil && strings.TrimSpace(cfg.UI.BaseURL) != "" {
		return strings.TrimRight(cfg.UI.BaseURL, "/")
	}
	return "http://localhost:5104"
}

// loadTenantMembership 判断用户归属，只使用 users.tenant_id 作为唯一标准。
// tenant_users 仅用于补充角色信息。
func loadTenantMembership(userID, tenantID uint) (model.User, *model.TenantUser, bool, error) {
	var user model.User
	if err := common.DB().Unscoped().First(&user, userID).Error; err != nil {
		return model.User{}, nil, false, err
	}

	if user.TenantID != tenantID || tenantID == 0 {
		return user, nil, false, nil
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

	return user, tenantUserPtr, true, nil
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

	// 基于 users.tenant_id 查询当前租户的所有用户，tenant_users 仅补充角色信息
	base := common.DB().Table("system_auth_users u").
		Joins("LEFT JOIN tenant_users ta ON ta.user_id = u.id AND ta.tenant_id = ?", tenantID).
		Where("u.tenant_id = ?", tenantID)

	// 搜索条件（邮箱/昵称）
	if search != "" {
		base = base.Where("LOWER(u.email) LIKE LOWER(?) OR LOWER(u.nickname) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}
	// 角色过滤
	if role != "" {
		if role == "user" {
			base = base.Where("(ta.role IS NULL OR ta.role = '')")
		} else {
			base = base.Where("ta.role = ?", role)
		}
	}
	// 状态过滤（如果想要根据状态过滤）
	if status != "" {
		if status == "baned" {
			base = base.Where("ta.role = ?", "baned")
		} else {
			switch status {
			case "active":
				base = base.Where("u.email_verified = 1 AND u.deleted_at IS NULL AND ta.role != 'baned'")
			case "inactive":
				base = base.Where("u.email_verified = 0 AND ta.role != 'baned'")
			case "suspended":
				base = base.Where("u.deleted_at IS NOT NULL AND ta.role != 'baned'")
			}
		}
	}

	// 统计用户数量
	var total int64
	if err := base.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户总数失败: " + err.Error(),
		})
	}

	// 列表查询并聚合
	// 注意：SQLite 中时间字段需要特殊处理
	type tenantUserRow struct {
		ID        uint   `json:"id"`
		Email     string `json:"email"`
		Nickname  string `json:"nickname"`
		Avatar    string `json:"avatar"`
		Role      string `json:"role"`
		Status    string `json:"status"`
		CreatedAt string `json:"created_at"` // 改为字符串接收
		UpdatedAt string `json:"updated_at"` // 改为字符串接收
	}

	var rows []tenantUserRow
	listQuery := base.Select(`
			u.id,
			u.email,
			u.nickname,
			COALESCE(u.avatar_url, '') as avatar,
			COALESCE(ta.role, 'user') as role,
			CASE 
				WHEN ta.role = 'baned' THEN 'baned'
				WHEN u.email_verified = 0 THEN 'inactive'
				WHEN u.deleted_at IS NOT NULL THEN 'suspended'
				ELSE 'active'
			END as status,
			ta.created_at as created_at,
			ta.updated_at as updated_at`).
		Order("ta.created_at DESC").
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
			ID:       r.ID,
			Email:    r.Email,
			Nickname: r.Nickname,
			Avatar:   r.Avatar,
			Role:     r.Role,
			Status:   r.Status,
		}

		// 转换时间字段
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
	base := common.DB().Table("system_auth_users").
		Joins("JOIN app_users au ON au.user_id = system_auth_users.id").
		Joins("JOIN apps a ON a.id = au.app_id").
		Where("a.tenant_id = ?", tenantID)

	if search != "" {
		base = base.Where("LOWER(system_auth_users.email) LIKE LOWER(?) OR LOWER(system_auth_users.nickname) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}
	if status != "" {
		base = base.Where("au.status = ?", status)
	}

	// 统计去重后的用户数量
	var total int64
	if err := base.Distinct("system_auth_users.id").Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "统计用户数量失败",
		})
	}

	// 查询列表：按用户分组聚合（最近授权/活跃时间、涉及应用数）
	var users []TenantAppLinkedUserResponse
	listQuery := base.Select(`
			system_auth_users.id,
			system_auth_users.email,
			system_auth_users.nickname,
			system_auth_users.avatar_url as avatar,
			COUNT(DISTINCT au.app_id) as app_count,
			MAX(au.last_authorized_at) as last_authorized_at,
			MAX(au.last_active_at) as last_active_at`).
		Group("system_auth_users.id, system_auth_users.email, system_auth_users.nickname, system_auth_users.avatar_url").
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

	// 基于 users.tenant_id 统计
	// 总用户数
	if err := common.DB().Table("system_auth_users").
		Where("tenant_id = ?", tenantID).
		Count(&stats.TotalUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计总用户数失败"})
	}

	// 活跃用户
	if err := common.DB().Table("system_auth_users u").
		Joins("LEFT JOIN tenant_users ta ON ta.user_id = u.id AND ta.tenant_id = ?", tenantID).
		Where("u.tenant_id = ? AND u.email_verified = 1 AND u.deleted_at IS NULL AND (ta.role IS NULL OR ta.role != 'baned')", tenantID).
		Count(&stats.ActiveUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计活跃用户数失败"})
	}

	// 暂停/封禁用户
	if err := common.DB().Table("system_auth_users u").
		Joins("LEFT JOIN tenant_users ta ON ta.user_id = u.id AND ta.tenant_id = ?", tenantID).
		Where("u.tenant_id = ? AND (u.deleted_at IS NOT NULL OR ta.role = 'baned')", tenantID).
		Count(&stats.SuspendedUsers).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计暂停用户数失败"})
	}

	// 本月新用户
	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	if err := common.DB().Table("system_auth_users").
		Where("tenant_id = ? AND created_at >= ?", tenantID, startOfMonth).
		Count(&stats.NewUsersThisMonth).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "统计本月新用户失败"})
	}

	return c.JSON(fiber.Map{
		"stats": stats,
	})
}

// GetGlobalUserCandidatesHandler 获取可授权加入当前租户的全局用户候选
// GET /api/v1/tenant/users/global-candidates
func GetGlobalUserCandidatesHandler(c *fiber.Ctx) error {
	if err := requireTenantAdminRole(c); err != nil {
		return err
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := strings.TrimSpace(c.Query("search", ""))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	query := common.DB().Table("system_auth_users").
		Where("tenant_id = ?", 0).
		Where("deleted_at IS NULL").
		Where("COALESCE(is_system_admin, 0) = 0")

	if search != "" {
		query = query.Where("LOWER(email) LIKE LOWER(?) OR LOWER(nickname) LIKE LOWER(?)", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询全局用户失败",
		})
	}

	var users []GlobalUserCandidateResponse
	if err := query.Select("id, email, nickname, COALESCE(avatar_url, '') as avatar, created_at").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Scan(&users).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询全局用户失败",
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

// AuthorizeGlobalUserToTenantHandler 授权全局用户加入当前租户
// POST /api/v1/tenant/users/global-candidates/:id/authorize
func AuthorizeGlobalUserToTenantHandler(c *fiber.Ctx) error {
	if err := requireTenantAdminRole(c); err != nil {
		return err
	}

	tenantID := c.Locals("tenantID").(uint)
	userIDUint64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "无效的用户ID",
		})
	}
	userID := uint(userIDUint64)

	var req AuthorizeGlobalUserRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	assignedRole := model.TenantRoleMember
	if strings.TrimSpace(req.Role) != "" {
		normalizedRole, _, ok := normalizeTenantInviteRole(req.Role)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的角色类型",
			})
		}
		assignedRole = normalizedRole
	}

	var user model.User
	if err := common.DB().First(&user, userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "用户不存在",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "查询用户失败",
		})
	}

	if user.IsSuperAdmin() {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "不支持授权系统管理员加入租户",
		})
	}

	if user.TenantID != 0 && user.TenantID != tenantID {
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

	if user.TenantID == 0 {
		if err := tx.Model(&model.User{}).Where("id = ?", user.ID).Update("tenant_id", tenantID).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "授权加入租户失败",
			})
		}
	}

	var tenantUser model.TenantUser
	err = tx.Where("tenant_id = ? AND user_id = ?", tenantID, user.ID).First(&tenantUser).Error
	if err != nil {
		if err != gorm.ErrRecordNotFound {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "授权加入租户失败",
			})
		}

		newTenantUser := model.TenantUser{
			UserID:   user.ID,
			TenantID: tenantID,
			Role:     assignedRole,
		}
		if err := tx.Create(&newTenantUser).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "授权加入租户失败",
			})
		}
	} else if strings.TrimSpace(req.Role) != "" && tenantUser.Role != model.TenantRoleOwner {
		tenantUser.Role = assignedRole
		if err := tx.Save(&tenantUser).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "授权加入租户失败",
			})
		}
	}

	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "授权加入租户失败",
		})
	}

	return c.JSON(fiber.Map{
		"message": "用户已加入当前租户",
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
		if *req.Role != "admin" && *req.Role != "user" && *req.Role != "baned" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "无效的角色类型",
			})
		}
		newRole := model.TenantRole(*req.Role)
		if tenantUser != nil {
			tenantUser.Role = newRole
		} else {
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

	// 主关系去除 users.tenant_id（如果仍要保留兼容），主要依靠 tenant_users 移除
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
	if err := requireTenantAdminRole(c); err != nil {
		return err
	}

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

	normalizedRole, roleLabel, ok := normalizeTenantInviteRole(req.Role)
	if !ok {
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

		// 非 owner 角色写入 tenant_users
		tenantUser := model.TenantUser{
			UserID:   existingUser.ID,
			TenantID: tenantID,
			Role:     normalizedRole,
		}
		if err := tx.Create(&tenantUser).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "添加用户到租户失败",
			})
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
			Role:      normalizedRole,
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

		originHeader := c.Get("Origin")
		refererHeader := c.Get("Referer")
		baseURL := resolveTenantInviteBaseURL(originHeader, refererHeader, config.Get())
		tenantCode := tenant.Code
		tenantName := tenant.Name
		inviteEmail := req.Email
		inviteToken := tokenStr
		inviteRoleLabel := roleLabel
		inviterUserID := inviterID

		// 异步发送邮件
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("[tenant_user] invitation email goroutine panic recovered: %v", r)
				}
			}()

			cfg := config.Get()
			emailSvc, err := emailservice.NewServiceFromConfig(cfg)
			if err == nil && emailSvc != nil {
				inviteLink := fmt.Sprintf(
					"%s/auth/tenant/%s/register?email=%s&invite_token=%s",
					baseURL,
					url.PathEscape(tenantCode),
					url.QueryEscape(inviteEmail),
					url.QueryEscape(inviteToken),
				)

				subject := fmt.Sprintf("Invitation to join %s on BasaltPass", tenantName)
				htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
    <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
        <div style="background-color:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 10px 34px rgba(0,0,0,0.035);">
            <div style="padding:32px 36px 22px;">
                <div style="font-size:12px;line-height:18px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#86868b;">BasaltPass</div>
                <h1 style="margin:14px 0 0;font-size:32px;line-height:38px;font-weight:600;letter-spacing:-0.02em;color:#1d1d1f;">Tenant invitation</h1>
            </div>
            <div style="padding:8px 36px 36px;">
                <p style="margin:0 0 26px;font-size:16px;line-height:28px;color:#424245;">
                    You have been invited to join <strong>%s</strong> as <strong>%s</strong>.
                </p>
                <p style="margin:0 0 26px;font-size:16px;line-height:28px;color:#424245;">
                    Use the button below to open the tenant registration page. If you already have an account, you can switch to sign in from there.
                </p>
                <div style="margin:0 0 24px;padding:28px 24px;border-radius:24px;background:linear-gradient(180deg,#fbfbfd 0%%,#f4f4f6 100%%);text-align:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.7);">
                    <a href="%s" style="display:inline-block;padding:14px 28px;border-radius:999px;background-color:#1d4ed8;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;">Open invitation</a>
                </div>
                <div style="margin:0 0 24px;padding:18px 20px;border-radius:18px;background-color:#f5f5f7;color:#424245;font-size:14px;line-height:24px;">
                    This invitation is linked to <strong style="color:#1d1d1f;font-weight:600;">%s</strong>. Please continue with the same email address when registering.
                </div>
                <p style="margin:0;font-size:13px;line-height:22px;color:#6e6e73;word-break:break-all;">
                    If the button does not work, copy and paste this link into your browser:<br>
                    <a href="%s" style="color:#1d4ed8;text-decoration:none;">%s</a>
                </p>
            </div>
            <div style="padding:20px 36px;background-color:#fbfbfd;">
                <p style="margin:0;font-size:12px;line-height:20px;color:#8d8d92;">
                    &copy; %d BasaltPass. This is an automated message, please do not reply.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
				`, tenantName, inviteRoleLabel, inviteLink, inviteEmail, inviteLink, inviteLink, time.Now().Year())

				msg := &emailservice.Message{
					To:       []string{inviteEmail},
					Subject:  subject,
					HTMLBody: htmlBody,
					TextBody: fmt.Sprintf(
						"You have been invited to join %s as %s. Open the tenant registration page here: %s",
						tenantName,
						inviteRoleLabel,
						inviteLink,
					),
				}
				_, sendErr := emailSvc.SendWithLogging(context.Background(), msg, &inviterUserID, "tenant_invitation")
				if sendErr != nil {
					log.Printf("[tenant_user] invitation email send failed: %v", sendErr)
				}
			} else {
				log.Printf("[tenant_user] init email service failed: %v", err)
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

	role := string(model.TenantRoleUser)
	createdAt := user.CreatedAt
	updatedAt := user.UpdatedAt
	if tenantUser != nil {
		role = string(tenantUser.Role)
		createdAt = tenantUser.CreatedAt
		updatedAt = tenantUser.UpdatedAt
	}

	status := "active"
	if role == "baned" {
		status = "baned"
	} else if !user.EmailVerified {
		status = "inactive"
	} else if user.DeletedAt.Valid {
		status = "suspended"
	}

	resp := TenantUserResponse{
		ID:        user.ID,
		Email:     user.Email,
		Nickname:  user.Nickname,
		Avatar:    user.AvatarURL,
		Role:      role,
		Status:    status,
		CreatedAt: createdAt,
		UpdatedAt: updatedAt,
	}

	return c.JSON(fiber.Map{
		"user": resp,
	})
}
