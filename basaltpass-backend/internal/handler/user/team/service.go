package team

import (
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service { return &Service{db: db} }

// CreateTeam 创建团队
func (s *Service) CreateTeam(userID uint, req *CreateTeamRequest) (*model.Team, error) {
	// 获取当前用户的tenant_id
	var user model.User
	if err := s.db.Select("tenant_id").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("获取用户信息失败: %w", err)
	}

	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	team := &model.Team{TenantID: user.TenantID, Name: req.Name, Description: req.Description, AvatarURL: req.AvatarURL, IsActive: true}
	if err := tx.Create(team).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建团队失败: %w", err)
	}

	member := &model.TeamMember{TeamID: team.ID, UserID: userID, Role: model.TeamRoleOwner, Status: "active"}
	if err := tx.Create(member).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建团队成员失败: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("提交事务失败: %w", err)
	}
	return team, nil
}

// GetTeam 获取团队信息
func (s *Service) GetTeam(teamID uint, userID uint) (*TeamResponse, error) {
	// 获取当前用户的tenant_id
	var user model.User
	if err := s.db.Select("tenant_id").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("获取用户信息失败: %w", err)
	}

	var team model.Team
	if err := s.db.Preload("Members.User").First(&team, teamID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("团队不存在")
		}
		return nil, fmt.Errorf("获取团队失败: %w", err)
	}

	// 验证团队和用户属于同一租户
	if team.TenantID != user.TenantID {
		return nil, errors.New("无权访问该团队")
	}

	var userRole *string
	for _, member := range team.Members {
		if member.UserID == userID {
			role := string(member.Role)
			userRole = &role
			break
		}
	}
	if userRole == nil {
		return nil, errors.New("您不是该团队成员")
	}
	resp := &TeamResponse{ID: team.ID, Name: team.Name, Description: team.Description, AvatarURL: team.AvatarURL, IsActive: team.IsActive, CreatedAt: team.CreatedAt.Format(time.RFC3339), UpdatedAt: team.UpdatedAt.Format(time.RFC3339), MemberCount: len(team.Members), UserRole: userRole}
	return resp, nil
}

// UpdateTeam 更新团队信息
func (s *Service) UpdateTeam(teamID uint, userID uint, req *UpdateTeamRequest) error {
	member, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}
	if !member.Role.CanManageTeam() {
		return errors.New("权限不足，只有管理员和所有者可以修改团队信息")
	}
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
	if err := s.db.Model(&model.Team{}).Where("id = ?", teamID).Updates(updates).Error; err != nil {
		return fmt.Errorf("更新团队失败: %w", err)
	}
	return nil
}

// DeleteTeam 删除团队
func (s *Service) DeleteTeam(teamID uint, userID uint) error {
	member, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}
	if !member.Role.IsOwner() {
		return errors.New("只有团队所有者可以删除团队")
	}
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	if err := tx.Where("team_id = ?", teamID).Delete(&model.TeamMember{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除团队成员失败: %w", err)
	}
	if err := tx.Delete(&model.Team{}, teamID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除团队失败: %w", err)
	}
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}
	return nil
}

// GetUserTeams 获取用户的所有团队
func (s *Service) GetUserTeams(userID uint) ([]UserTeamResponse, error) {
	// 获取当前用户的tenant_id
	var user model.User
	if err := s.db.Select("tenant_id").First(&user, userID).Error; err != nil {
		return nil, fmt.Errorf("获取用户信息失败: %w", err)
	}

	var members []model.TeamMember
	// 通过JOIN确保只返回同一租户的团队
	if err := s.db.Preload("Team").
		Joins("JOIN teams ON teams.id = team_members.team_id").
		Where("team_members.user_id = ? AND teams.tenant_id = ?", userID, user.TenantID).
		Find(&members).Error; err != nil {
		return nil, fmt.Errorf("获取用户团队失败: %w", err)
	}
	teams := make([]UserTeamResponse, 0, len(members))
	for _, m := range members {
		teams = append(teams, UserTeamResponse{TeamID: m.TeamID, TeamName: m.Team.Name, Role: string(m.Role), JoinedAt: time.Unix(m.JoinedAt, 0).Format(time.RFC3339)})
	}
	return teams, nil
}

// AddMember 添加团队成员
func (s *Service) AddMember(teamID uint, userID uint, req *AddMemberRequest) error {
	operator, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}
	if !operator.Role.CanManageMembers() {
		return errors.New("权限不足，只有管理员和所有者可以添加成员")
	}
	var existing model.TeamMember
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, req.UserID).First(&existing).Error; err == nil {
		return errors.New("用户已经是团队成员")
	}
	// 获取团队信息以验证租户
	var team model.Team
	if err := s.db.Select("tenant_id").First(&team, teamID).Error; err != nil {
		return fmt.Errorf("获取团队信息失败: %w", err)
	}

	var user model.User
	if err := s.db.First(&user, req.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return fmt.Errorf("查询用户失败: %w", err)
	}

	// 验证被添加用户与团队属于同一租户
	if user.TenantID != team.TenantID {
		return errors.New("只能添加同一租户的用户")
	}

	member := &model.TeamMember{TeamID: teamID, UserID: req.UserID, Role: req.Role, Status: "active"}
	if err := s.db.Create(member).Error; err != nil {
		return fmt.Errorf("添加成员失败: %w", err)
	}
	return nil
}

// UpdateMemberRole 更新成员角色
func (s *Service) UpdateMemberRole(teamID uint, operatorID uint, memberID uint, req *UpdateMemberRoleRequest) error {
	operator, err := s.getTeamMember(teamID, operatorID)
	if err != nil {
		return err
	}
	if !operator.Role.CanManageMembers() {
		return errors.New("权限不足，只有管理员和所有者可以修改成员角色")
	}
	target, err := s.getTeamMember(teamID, memberID)
	if err != nil {
		return err
	}
	if target.Role.IsOwner() && req.Role != model.TeamRoleOwner {
		return errors.New("不能修改所有者的角色")
	}
	if err := s.db.Model(&model.TeamMember{}).Where("team_id = ? AND user_id = ?", teamID, memberID).Update("role", req.Role).Error; err != nil {
		return fmt.Errorf("更新成员角色失败: %w", err)
	}
	return nil
}

// RemoveMember 移除团队成员
func (s *Service) RemoveMember(teamID uint, operatorID uint, memberID uint) error {
	operator, err := s.getTeamMember(teamID, operatorID)
	if err != nil {
		return err
	}
	if !operator.Role.CanManageMembers() {
		return errors.New("权限不足，只有管理员和所有者可以移除成员")
	}
	target, err := s.getTeamMember(teamID, memberID)
	if err != nil {
		return err
	}
	if target.Role.IsOwner() {
		return errors.New("不能移除团队所有者")
	}
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, memberID).Delete(&model.TeamMember{}).Error; err != nil {
		return fmt.Errorf("移除成员失败: %w", err)
	}
	return nil
}

// GetTeamMembers 获取团队成员列表
func (s *Service) GetTeamMembers(teamID uint, userID uint) ([]TeamMemberResponse, error) {
	if _, err := s.getTeamMember(teamID, userID); err != nil {
		return nil, err
	}
	var members []model.TeamMember
	if err := s.db.Preload("User").Where("team_id = ?", teamID).Find(&members).Error; err != nil {
		return nil, fmt.Errorf("获取团队成员失败: %w", err)
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

// LeaveTeam 离开团队
func (s *Service) LeaveTeam(teamID uint, userID uint) error {
	member, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}
	if member.Role.IsOwner() {
		return errors.New("团队所有者不能离开团队，请先转让所有权或删除团队")
	}
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, userID).Delete(&model.TeamMember{}).Error; err != nil {
		return fmt.Errorf("离开团队失败: %w", err)
	}
	return nil
}

// getTeamMember 获取团队成员信息
func (s *Service) getTeamMember(teamID uint, userID uint) (*model.TeamMember, error) {
	var member model.TeamMember
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, userID).First(&member).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("您不是该团队成员")
		}
		return nil, fmt.Errorf("查询团队成员失败: %w", err)
	}
	return &member, nil
}
