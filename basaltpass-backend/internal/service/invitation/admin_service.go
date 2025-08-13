package invitation

import (
	admindto "basaltpass-backend/internal/dto/invitation"
	"basaltpass-backend/internal/model"
	"time"

	"gorm.io/gorm"
)

type AdminService struct{ db *gorm.DB }

func NewAdminService(db *gorm.DB) *AdminService { return &AdminService{db: db} }

// List 列出邀请
func (s *AdminService) List(req admindto.AdminListInvitationsRequest) (admindto.AdminListInvitationsResponse, error) {
	q := s.db.Model(&model.Invitation{}).Preload("Team")
	if req.TeamID > 0 {
		q = q.Where("team_id = ?", req.TeamID)
	}
	if req.InviterID > 0 {
		q = q.Where("inviter_id = ?", req.InviterID)
	}
	if req.InviteeID > 0 {
		q = q.Where("invitee_id = ?", req.InviteeID)
	}
	if req.Status != "" && req.Status != "all" {
		q = q.Where("status = ?", req.Status)
	}
	if req.Keyword != "" {
		like := "%" + req.Keyword + "%"
		q = q.Joins("LEFT JOIN teams ON teams.id = invitations.team_id").Where("invitations.remark LIKE ? OR teams.name LIKE ?", like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return admindto.AdminListInvitationsResponse{}, err
	}
	page, limit := req.Page, req.Limit
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var list []model.Invitation
	if err := q.Order("id DESC").Limit(limit).Offset((page - 1) * limit).Find(&list).Error; err != nil {
		return admindto.AdminListInvitationsResponse{}, err
	}
	items := make([]admindto.AdminInvitationBrief, 0, len(list))
	for _, inv := range list {
		items = append(items, admindto.AdminInvitationBrief{ID: inv.ID, TeamID: inv.TeamID, TeamName: inv.Team.Name, InviterID: inv.InviterID, InviteeID: inv.InviteeID, Status: inv.Status, Remark: inv.Remark, CreatedAt: inv.CreatedAt.Format(time.RFC3339), UpdatedAt: inv.UpdatedAt.Format(time.RFC3339)})
	}
	return admindto.AdminListInvitationsResponse{Invitations: items, Total: int(total)}, nil
}

// Create 批量创建
func (s *AdminService) Create(req admindto.AdminCreateInvitationRequest) error {
	if len(req.InviteeIDs) == 0 {
		return nil
	}
	now := time.Now()
	invites := make([]model.Invitation, 0, len(req.InviteeIDs))
	for _, uid := range req.InviteeIDs {
		invites = append(invites, model.Invitation{TeamID: req.TeamID, InviterID: req.InviterID, InviteeID: uid, Remark: req.Remark, CreatedAt: now, UpdatedAt: now})
	}
	return s.db.Create(&invites).Error
}

// UpdateStatus 强制修改状态
func (s *AdminService) UpdateStatus(id uint, status string) error {
	return s.db.Model(&model.Invitation{}).Where("id = ?", id).Update("status", status).Error
}

// Delete 软删除
func (s *AdminService) Delete(id uint) error { return s.db.Delete(&model.Invitation{}, id).Error }
