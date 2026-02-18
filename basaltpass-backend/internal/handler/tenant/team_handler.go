package tenant

import (
	"strconv"
	"time"

	"basaltpass-backend/internal/common"
	admindto "basaltpass-backend/internal/dto/team"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func getTenantTeam(db *gorm.DB, tenantID uint, teamID uint) (*model.Team, error) {
	var team model.Team
	if err := db.Where("id = ? AND tenant_id = ?", teamID, tenantID).First(&team).Error; err != nil {
		return nil, err
	}
	return &team, nil
}

// ListTenantTeamsHandler 获取租户团队列表
// GET /api/v1/tenant/teams
func ListTenantTeamsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	var req admindto.ListTeamsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数错误"})
	}

	page, limit := req.Page, req.Limit
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	var teams []model.Team
	q := common.DB().Preload("Members").Model(&model.Team{}).Where("tenant_id = ?", tenantID)
	if req.Keyword != "" {
		like := "%" + req.Keyword + "%"
		q = q.Where("name LIKE ? OR description LIKE ?", like, like)
	}

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if err := q.Order("id DESC").Limit(limit).Offset((page - 1) * limit).Find(&teams).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	items := make([]admindto.TeamBrief, 0, len(teams))
	for _, t := range teams {
		items = append(items, admindto.TeamBrief{
			ID:          t.ID,
			Name:        t.Name,
			Description: t.Description,
			AvatarURL:   t.AvatarURL,
			IsActive:    t.IsActive,
			MemberCount: len(t.Members),
			CreatedAt:   t.CreatedAt.Format(time.RFC3339),
		})
	}

	return c.JSON(admindto.ListTeamsResponse{Teams: items, Total: int(total)})
}

// CreateTenantTeamHandler 创建租户团队
// POST /api/v1/tenant/teams
func CreateTenantTeamHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	operatorID := c.Locals("userID").(uint)

	var req admindto.AdminCreateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "团队名称不能为空"})
	}

	ownerUserID := req.OwnerUserID
	if ownerUserID == 0 {
		ownerUserID = operatorID
	}

	_, _, ownerBelongs, err := loadTenantMembership(ownerUserID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "所有者用户不存在"})
	}
	if !ownerBelongs {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "所有者用户不属于当前租户"})
	}

	t := model.Team{
		TenantID:    tenantID,
		Name:        req.Name,
		Description: req.Description,
		AvatarURL:   req.AvatarURL,
		IsActive:    true,
	}

	if err := common.DB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&t).Error; err != nil {
			return err
		}
		member := model.TeamMember{
			TeamID:   t.ID,
			UserID:   ownerUserID,
			Role:     model.TeamRoleOwner,
			Status:   "active",
			JoinedAt: time.Now().Unix(),
		}
		return tx.Create(&member).Error
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "创建成功", "id": t.ID})
}

// GetTenantTeamHandler 获取租户团队详情
// GET /api/v1/tenant/teams/:id
func GetTenantTeamHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}

	var team model.Team
	if err := common.DB().Preload("Members.User").Where("id = ? AND tenant_id = ?", uint(id), tenantID).First(&team).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(team)
}

// UpdateTenantTeamHandler 更新租户团队
// PUT /api/v1/tenant/teams/:id
func UpdateTenantTeamHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}

	if _, err := getTenantTeam(common.DB(), tenantID, uint(id)); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var req admindto.AdminUpdateTeamRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	updates := map[string]any{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if len(updates) == 0 {
		return c.JSON(fiber.Map{"message": "更新成功"})
	}

	if err := common.DB().Model(&model.Team{}).
		Where("id = ? AND tenant_id = ?", uint(id), tenantID).
		Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "更新成功"})
}

// DeleteTenantTeamHandler 删除租户团队
// DELETE /api/v1/tenant/teams/:id
func DeleteTenantTeamHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}

	teamID := uint(id)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if err := common.DB().Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("team_id = ?", teamID).Delete(&model.TeamMember{}).Error; err != nil {
			return err
		}
		if err := tx.Where("id = ? AND tenant_id = ?", teamID, tenantID).Delete(&model.Team{}).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "删除成功"})
}

// ListTenantTeamMembersHandler 获取租户团队成员
// GET /api/v1/tenant/teams/:id/members
func ListTenantTeamMembersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}

	teamID := uint(id)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var members []model.TeamMember
	if err := common.DB().Preload("User").Where("team_id = ?", teamID).Find(&members).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	res := make([]admindto.TeamMemberResponse, 0, len(members))
	for _, m := range members {
		r := admindto.TeamMemberResponse{
			ID:        m.ID,
			TeamID:    m.TeamID,
			UserID:    m.UserID,
			Role:      string(m.Role),
			Status:    m.Status,
			JoinedAt:  time.Unix(m.JoinedAt, 0).Format(time.RFC3339),
			CreatedAt: m.CreatedAt.Format(time.RFC3339),
		}
		r.User.ID = m.User.ID
		r.User.Email = m.User.Email
		r.User.Nickname = m.User.Nickname
		r.User.AvatarURL = m.User.AvatarURL
		res = append(res, r)
	}

	return c.JSON(res)
}

// AddTenantTeamMemberHandler 添加租户团队成员
// POST /api/v1/tenant/teams/:id/members
func AddTenantTeamMemberHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}

	teamID := uint(id)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var req admindto.AddMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if req.UserID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户ID不能为空"})
	}
	if !req.Role.IsValid() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色"})
	}

	_, _, belongs, err := loadTenantMembership(req.UserID, tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}
	if !belongs {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不属于当前租户"})
	}

	var existing model.TeamMember
	if err := common.DB().Where("team_id = ? AND user_id = ?", teamID, req.UserID).First(&existing).Error; err == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户已经是团队成员"})
	}

	member := model.TeamMember{
		TeamID:   teamID,
		UserID:   req.UserID,
		Role:     req.Role,
		Status:   "active",
		JoinedAt: time.Now().Unix(),
	}
	if err := common.DB().Create(&member).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "添加成功"})
}

// RemoveTenantTeamMemberHandler 移除租户团队成员
// DELETE /api/v1/tenant/teams/:id/members/:user_id
func RemoveTenantTeamMemberHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}
	uid, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	teamID := uint(id)
	userID := uint(uid)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var target model.TeamMember
	if err := common.DB().Where("team_id = ? AND user_id = ?", teamID, userID).First(&target).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "成员不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if target.Role.IsOwner() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "不能移除团队所有者"})
	}

	if err := common.DB().Where("team_id = ? AND user_id = ?", teamID, userID).Delete(&model.TeamMember{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "移除成功"})
}

// UpdateTenantTeamMemberRoleHandler 更新租户团队成员角色
// PUT /api/v1/tenant/teams/:id/members/:user_id/role
func UpdateTenantTeamMemberRoleHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}
	uid, err := strconv.ParseUint(c.Params("user_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的用户ID"})
	}

	teamID := uint(id)
	userID := uint(uid)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var body struct {
		Role model.TeamRole `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if !body.Role.IsValid() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的角色"})
	}

	var target model.TeamMember
	if err := common.DB().Where("team_id = ? AND user_id = ?", teamID, userID).First(&target).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "成员不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if target.Role.IsOwner() && body.Role != model.TeamRoleOwner {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请使用转移所有者接口处理所有者变更"})
	}

	if err := common.DB().Model(&model.TeamMember{}).
		Where("team_id = ? AND user_id = ?", teamID, userID).
		Update("role", body.Role).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "更新成功"})
}

// TransferTenantTeamOwnershipHandler 转移团队所有者
// POST /api/v1/tenant/teams/:id/transfer/:new_owner_id
func TransferTenantTeamOwnershipHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}
	uid, err := strconv.ParseUint(c.Params("new_owner_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的新所有者ID"})
	}

	teamID := uint(id)
	newOwnerID := uint(uid)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if err := common.DB().Transaction(func(tx *gorm.DB) error {
		var currentOwner model.TeamMember
		if err := tx.Where("team_id = ? AND role = ?", teamID, model.TeamRoleOwner).First(&currentOwner).Error; err != nil {
			return err
		}

		var newOwner model.TeamMember
		if err := tx.Where("team_id = ? AND user_id = ?", teamID, newOwnerID).First(&newOwner).Error; err != nil {
			return err
		}

		if err := tx.Model(&model.TeamMember{}).
			Where("team_id = ? AND user_id = ?", teamID, currentOwner.UserID).
			Update("role", model.TeamRoleAdmin).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.TeamMember{}).
			Where("team_id = ? AND user_id = ?", teamID, newOwnerID).
			Update("role", model.TeamRoleOwner).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "转移成功"})
}

// ToggleTenantTeamActiveHandler 启用/停用团队
// POST /api/v1/tenant/teams/:id/active
func ToggleTenantTeamActiveHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的团队ID"})
	}
	teamID := uint(id)
	if _, err := getTenantTeam(common.DB(), tenantID, teamID); err != nil {
		if err == gorm.ErrRecordNotFound {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "团队不存在"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var body struct {
		Active bool `json:"active"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	if err := common.DB().Model(&model.Team{}).
		Where("id = ? AND tenant_id = ?", teamID, tenantID).
		Update("is_active", body.Active).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "状态已更新"})
}
