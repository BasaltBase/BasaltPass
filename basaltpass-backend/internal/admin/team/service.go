package team

import (
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

type Service struct{ db *gorm.DB }

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

func (s *Service) ListTeams(req ListTeamsRequest) (ListTeamsResponse, error) {
	var teams []model.Team
	q := s.db.Preload("Members").Model(&model.Team{})
	if req.Keyword != "" {
		like := "%" + req.Keyword + "%"
		q = q.Where("name LIKE ? OR description LIKE ?", like, like)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return ListTeamsResponse{}, err
	}
	page, limit := req.Page, req.Limit
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if err := q.Order("id DESC").Limit(limit).Offset((page - 1) * limit).Find(&teams).Error; err != nil {
		return ListTeamsResponse{}, err
	}
	items := make([]TeamBrief, 0, len(teams))
	for _, t := range teams {
		items = append(items, TeamBrief{ID: t.ID, Name: t.Name, Description: t.Description, AvatarURL: t.AvatarURL, IsActive: t.IsActive, MemberCount: len(t.Members), CreatedAt: t.CreatedAt.Format(time.RFC3339)})
	}
	return ListTeamsResponse{Teams: items, Total: int(total)}, nil
}

func (s *Service) GetTeam(id uint) (*model.Team, error) {
	var t model.Team
	if err := s.db.Preload("Members.User").First(&t, id).Error; err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *Service) UpdateTeam(id uint, req AdminUpdateTeamRequest) error {
	updates := map[string]interface{}{}
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
		return nil
	}
	return s.db.Model(&model.Team{}).Where("id = ?", id).Updates(updates).Error
}

func (s *Service) DeleteTeam(id uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("team_id = ?", id).Delete(&model.TeamMember{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&model.Team{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *Service) AddMember(id uint, req AddMemberRequest) error {
	m := model.TeamMember{TeamID: id, UserID: req.UserID, Role: req.Role, Status: "active"}
	return s.db.Create(&m).Error
}

func (s *Service) RemoveMember(id uint, userID uint) error {
	return s.db.Where("team_id = ? AND user_id = ?", id, userID).Delete(&model.TeamMember{}).Error
}

func (s *Service) ListMembers(id uint) ([]TeamMemberResponse, error) {
	var members []model.TeamMember
	if err := s.db.Preload("User").Where("team_id = ?", id).Find(&members).Error; err != nil {
		return nil, err
	}
	res := make([]TeamMemberResponse, 0, len(members))
	for _, m := range members {
		r := TeamMemberResponse{ID: m.ID, TeamID: m.TeamID, UserID: m.UserID, Role: string(m.Role), Status: m.Status, JoinedAt: time.Unix(m.JoinedAt, 0).Format(time.RFC3339), CreatedAt: m.CreatedAt.Format(time.RFC3339)}
		r.User.ID = m.User.ID
		r.User.Email = m.User.Email
		r.User.Nickname = m.User.Nickname
		r.User.AvatarURL = m.User.AvatarURL
		res = append(res, r)
	}
	return res, nil
}

func (s *Service) TransferOwnership(teamID, newOwnerID uint) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		var currentOwner model.TeamMember
		if err := tx.Where("team_id = ? AND role = ?", teamID, model.TeamRoleOwner).First(&currentOwner).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.TeamMember{}).Where("team_id = ? AND user_id = ?", teamID, currentOwner.UserID).Update("role", model.TeamRoleAdmin).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.TeamMember{}).Where("team_id = ? AND user_id = ?", teamID, newOwnerID).Update("role", model.TeamRoleOwner).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *Service) ToggleActive(teamID uint, active bool) error {
	return s.db.Model(&model.Team{}).Where("id = ?", teamID).Update("is_active", active).Error
}

func (s *Service) Stats() (map[string]any, error) {
	var total int64
	if err := s.db.Model(&model.Team{}).Count(&total).Error; err != nil {
		return nil, err
	}
	var active int64
	if err := s.db.Model(&model.Team{}).Where("is_active = ?", true).Count(&active).Error; err != nil {
		return nil, err
	}
	return map[string]any{"total": total, "active": active, "inactive": total - active, "generated_at": time.Now().Format(time.RFC3339)}, nil
}
