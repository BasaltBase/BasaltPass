package tenant

import (
	"strconv"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// RoleRequest 创建/更新角色请求
type RoleRequest struct {
	Code        string `json:"code" validate:"required,min=2,max=64"`
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	AppID       *uint  `json:"app_id,omitempty"`
}

// RoleResponse 角色响应
type RoleResponse struct {
	ID          uint             `json:"id"`
	Code        string           `json:"code"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	AppID       *uint            `json:"app_id,omitempty"`
	AppName     string           `json:"app_name,omitempty"`
	IsSystem    bool             `json:"is_system"`
	UserCount   int64            `json:"user_count"`
	Permissions []PermissionInfo `json:"permissions,omitempty"`
	CreatedAt   string           `json:"created_at"`
	UpdatedAt   string           `json:"updated_at"`
}

// PermissionInfo 权限信息
type PermissionInfo struct {
	ID   uint   `json:"id"`
	Code string `json:"code"`
	Desc string `json:"desc"`
}

// UserRoleRequest 分配用户角色请求
type UserRoleRequest struct {
	UserID  uint   `json:"user_id" validate:"required"`
	RoleIDs []uint `json:"role_ids" validate:"required"`
}

// UserRoleResponse 用户角色响应
type UserRoleResponse struct {
	UserID   uint           `json:"user_id"`
	Email    string         `json:"email"`
	Nickname string         `json:"nickname"`
	Roles    []RoleResponse `json:"roles"`
}

// TenantUserInfo 租户用户信息
type TenantUserInfo struct {
	ID       uint   `json:"id"`
	Email    string `json:"email"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"` // tenant role: owner, admin, member
}

// CreateTenantRole 创建租户角色
func CreateTenantRole(c *fiber.Ctx) error {
	var req RoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 检查角色代码是否重复
	var existingRole model.Role
	err := common.DB().Where("tenant_id = ? AND code = ?", tenantID, req.Code).First(&existingRole).Error
	if err == nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "角色代码已存在"})
	}
	if err != gorm.ErrRecordNotFound {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查角色代码失败"})
	}

	// 如果指定了应用ID，检查应用是否属于当前租户
	if req.AppID != nil {
		var app model.App
		err := common.DB().Where("id = ? AND tenant_id = ?", *req.AppID, tenantID).First(&app).Error
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "应用不存在或不属于当前租户"})
		}
	}

	role := model.Role{
		TenantID:    tenantID,
		AppID:       req.AppID,
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		IsSystem:    false,
	}

	if err := common.DB().Create(&role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "创建角色失败"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "角色创建成功",
		"data":    role,
	})
}

// GetTenantRoles 获取租户角色列表
func GetTenantRoles(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 解析查询参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	appID := c.Query("app_id")
	search := c.Query("search")

	offset := (page - 1) * pageSize

	// 构建查询
	query := common.DB().Where("tenant_id = ?", tenantID)

	if appID != "" {
		if appID == "tenant" {
			query = query.Where("app_id IS NULL")
		} else {
			query = query.Where("app_id = ?", appID)
		}
	}

	if search != "" {
		query = query.Where("(name LIKE ? OR code LIKE ? OR description LIKE ?)",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// 获取总数
	var total int64
	query.Model(&model.Role{}).Count(&total)

	// 获取角色列表
	var roles []model.Role
	err := query.Preload("App").
		Offset(offset).
		Limit(pageSize).
		Order("created_at DESC").
		Find(&roles).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取角色列表失败"})
	}

	// 转换为响应格式并统计用户数量
	var roleResponses []RoleResponse
	for _, role := range roles {
		// 统计使用该角色的用户数量
		var userCount int64
		common.DB().Model(&model.UserRole{}).Where("role_id = ?", role.ID).Count(&userCount)

		roleResp := RoleResponse{
			ID:          role.ID,
			Code:        role.Code,
			Name:        role.Name,
			Description: role.Description,
			AppID:       role.AppID,
			IsSystem:    role.IsSystem,
			UserCount:   userCount,
			CreatedAt:   role.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   role.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		if role.App != nil {
			roleResp.AppName = role.App.Name
		}

		roleResponses = append(roleResponses, roleResp)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": fiber.Map{
			"roles": roleResponses,
			"pagination": fiber.Map{
				"page":      page,
				"page_size": pageSize,
				"total":     total,
			},
		},
	})
}

// UpdateTenantRole 更新租户角色
func UpdateTenantRole(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	var req RoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 检查角色是否存在且属于当前租户
	var role model.Role
	err = common.DB().Where("id = ? AND tenant_id = ?", roleID, tenantID).First(&role).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "角色不存在"})
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "查询角色失败"})
		}
	}

	// 检查是否为系统角色
	if role.IsSystem {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "系统角色不能修改"})
	}

	// 检查新的角色代码是否重复（排除自己）
	if req.Code != role.Code {
		var existingRole model.Role
		err := common.DB().Where("tenant_id = ? AND code = ? AND id != ?", tenantID, req.Code, roleID).First(&existingRole).Error
		if err == nil {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "角色代码已存在"})
		}
		if err != gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "检查角色代码失败"})
		}
	}

	// 如果指定了应用ID，检查应用是否属于当前租户
	if req.AppID != nil {
		var app model.App
		err := common.DB().Where("id = ? AND tenant_id = ?", *req.AppID, tenantID).First(&app).Error
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "应用不存在或不属于当前租户"})
		}
	}

	// 更新角色
	role.Code = req.Code
	role.Name = req.Name
	role.Description = req.Description
	role.AppID = req.AppID

	if err := common.DB().Save(&role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新角色失败"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "角色更新成功",
		"data":    role,
	})
}

// DeleteTenantRole 删除租户角色
func DeleteTenantRole(c *fiber.Ctx) error {
	roleID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色ID"})
	}

	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 检查角色是否存在且属于当前租户
	var role model.Role
	err = common.DB().Where("id = ? AND tenant_id = ?", roleID, tenantID).First(&role).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "角色不存在"})
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "查询角色失败"})
		}
	}

	// 检查是否为系统角色
	if role.IsSystem {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "系统角色不能删除"})
	}

	// 检查是否有用户正在使用该角色
	var userCount int64
	common.DB().Model(&model.UserRole{}).Where("role_id = ?", roleID).Count(&userCount)
	if userCount > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "该角色正在被用户使用，无法删除"})
	}

	// 开始事务删除角色及其权限关联
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除角色权限关联
	if err := tx.Where("role_id = ?", roleID).Delete(&model.RolePermission{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "删除角色权限关联失败"})
	}

	// 删除角色
	if err := tx.Delete(&role).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "删除角色失败"})
	}

	tx.Commit()
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "角色删除成功"})
}

// AssignUserRoles 分配用户角色
func AssignUserRoles(c *fiber.Ctx) error {
	var req UserRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 检查用户是否属于当前租户（通过TenantAdmin表）
	var tenantAdmin model.TenantAdmin
	err := common.DB().Where("user_id = ? AND tenant_id = ?", req.UserID, tenantID).First(&tenantAdmin).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "用户不存在或不属于当前租户"})
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "查询用户失败"})
		}
	}

	// 检查所有角色是否都属于当前租户
	var roleCount int64
	common.DB().Model(&model.Role{}).Where("id IN ? AND tenant_id = ?", req.RoleIDs, tenantID).Count(&roleCount)
	if int(roleCount) != len(req.RoleIDs) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "存在不属于当前租户的角色"})
	}

	// 开始事务处理用户角色分配
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除用户的所有角色（仅限当前租户的角色）
	if err := tx.Where("user_id = ? AND role_id IN (SELECT id FROM roles WHERE tenant_id = ?)",
		req.UserID, tenantID).Delete(&model.UserRole{}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "删除用户原有角色失败"})
	}

	// 分配新角色
	for _, roleID := range req.RoleIDs {
		userRole := model.UserRole{
			UserID: req.UserID,
			RoleID: roleID,
		}
		if err := tx.Create(&userRole).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "分配用户角色失败"})
		}
	}

	tx.Commit()
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "用户角色分配成功"})
}

// GetUserRoles 获取用户角色
func GetUserRoles(c *fiber.Ctx) error {
	userID, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 检查用户是否属于当前租户并获取用户信息
	var tenantAdmin model.TenantAdmin
	err = common.DB().Preload("User").Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "用户不存在或不属于当前租户"})
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "查询用户失败"})
		}
	}

	// 获取用户的角色
	var roles []model.Role
	err = common.DB().Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ?", userID, tenantID).
		Preload("App").
		Find(&roles).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取用户角色失败"})
	}

	// 转换为响应格式
	var roleResponses []RoleResponse
	for _, role := range roles {
		roleResp := RoleResponse{
			ID:          role.ID,
			Code:        role.Code,
			Name:        role.Name,
			Description: role.Description,
			AppID:       role.AppID,
			IsSystem:    role.IsSystem,
			CreatedAt:   role.CreatedAt.Format("2006-01-02 15:04:05"),
			UpdatedAt:   role.UpdatedAt.Format("2006-01-02 15:04:05"),
		}

		if role.App != nil {
			roleResp.AppName = role.App.Name
		}

		roleResponses = append(roleResponses, roleResp)
	}

	userRoleResponse := UserRoleResponse{
		UserID:   tenantAdmin.User.ID,
		Email:    tenantAdmin.User.Email,
		Nickname: tenantAdmin.User.Nickname,
		Roles:    roleResponses,
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": userRoleResponse})
}

// GetTenantUsersForRole 获取租户用户列表（用于角色分配）
func GetTenantUsersForRole(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	if tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "未找到租户信息"})
	}

	// 解析查询参数
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	search := c.Query("search")

	offset := (page - 1) * pageSize

	// 构建查询 - 通过TenantAdmin表获取租户用户
	query := common.DB().Table("tenant_admins").
		Select("users.id, users.email, users.nickname, tenant_admins.role, tenant_admins.created_at").
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ?", tenantID)

	if search != "" {
		query = query.Where("(users.email LIKE ? OR users.nickname LIKE ?)",
			"%"+search+"%", "%"+search+"%")
	}

	// 获取总数
	var total int64
	countQuery := common.DB().Table("tenant_admins").
		Joins("JOIN users ON users.id = tenant_admins.user_id").
		Where("tenant_admins.tenant_id = ?", tenantID)
	if search != "" {
		countQuery = countQuery.Where("(users.email LIKE ? OR users.nickname LIKE ?)",
			"%"+search+"%", "%"+search+"%")
	}
	countQuery.Count(&total)

	// 获取用户列表
	var users []TenantUserInfo
	err := query.Offset(offset).
		Limit(pageSize).
		Order("tenant_admins.created_at DESC").
		Scan(&users).Error
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取用户列表失败"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"data": fiber.Map{
			"users": users,
			"pagination": fiber.Map{
				"page":      page,
				"page_size": pageSize,
				"total":     total,
			},
		},
	})
}
