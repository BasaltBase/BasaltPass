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

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// CreateTeam 创建团队
func (s *Service) CreateTeam(userID uint, req *CreateTeamRequest) (*model.Team, error) {
	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 创建团队
	team := &model.Team{
		Name:        req.Name,
		Description: req.Description,
		AvatarURL:   req.AvatarURL,
		IsActive:    true,
	}

	if err := tx.Create(team).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建团队失败: %w", err)
	}

	// 创建团队成员记录（创建者为所有者）
	member := &model.TeamMember{
		TeamID: team.ID,
		UserID: userID,
		Role:   model.TeamRoleOwner,
		Status: "active",
	}

	if err := tx.Create(member).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建团队成员失败: %w", err)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("提交事务失败: %w", err)
	}

	return team, nil
}

// GetTeam 获取团队信息
func (s *Service) GetTeam(teamID uint, userID uint) (*TeamResponse, error) {
	var team model.Team
	if err := s.db.Preload("Members.User").First(&team, teamID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("团队不存在")
		}
		return nil, fmt.Errorf("获取团队失败: %w", err)
	}

	// 检查用户是否为团队成员
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

	response := &TeamResponse{
		ID:          team.ID,
		Name:        team.Name,
		Description: team.Description,
		AvatarURL:   team.AvatarURL,
		IsActive:    team.IsActive,
		CreatedAt:   team.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   team.UpdatedAt.Format(time.RFC3339),
		MemberCount: len(team.Members),
		UserRole:    userRole,
	}

	return response, nil
}

// UpdateTeam 更新团队信息
func (s *Service) UpdateTeam(teamID uint, userID uint, req *UpdateTeamRequest) error {
	// 检查用户权限
	member, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}

	if !member.Role.CanManageTeam() {
		return errors.New("权限不足，只有管理员和所有者可以修改团队信息")
	}

	// 更新团队信息
	updates := make(map[string]interface{})
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
	// 检查用户权限
	member, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}

	if !member.Role.IsOwner() {
		return errors.New("只有团队所有者可以删除团队")
	}

	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 删除团队成员
	if err := tx.Where("team_id = ?", teamID).Delete(&model.TeamMember{}).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除团队成员失败: %w", err)
	}

	// 删除团队
	if err := tx.Delete(&model.Team{}, teamID).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("删除团队失败: %w", err)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}

	return nil
}

// GetUserTeams 获取用户的所有团队
func (s *Service) GetUserTeams(userID uint) ([]UserTeamResponse, error) {
	var members []model.TeamMember
	if err := s.db.Preload("Team").Where("user_id = ?", userID).Find(&members).Error; err != nil {
		return nil, fmt.Errorf("获取用户团队失败: %w", err)
	}

	var teams []UserTeamResponse
	for _, member := range members {
		teams = append(teams, UserTeamResponse{
			TeamID:   member.TeamID,
			TeamName: member.Team.Name,
			Role:     string(member.Role),
			JoinedAt: time.Unix(member.JoinedAt, 0).Format(time.RFC3339),
		})
	}

	return teams, nil
}

// AddMember 添加团队成员
func (s *Service) AddMember(teamID uint, userID uint, req *AddMemberRequest) error {
	// 检查操作者权限
	operator, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}

	if !operator.Role.CanManageMembers() {
		return errors.New("权限不足，只有管理员和所有者可以添加成员")
	}

	// 检查用户是否已经是团队成员
	var existingMember model.TeamMember
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, req.UserID).First(&existingMember).Error; err == nil {
		return errors.New("用户已经是团队成员")
	}

	// 检查用户是否存在
	var user model.User
	if err := s.db.First(&user, req.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("用户不存在")
		}
		return fmt.Errorf("查询用户失败: %w", err)
	}

	// 创建团队成员
	member := &model.TeamMember{
		TeamID: teamID,
		UserID: req.UserID,
		Role:   req.Role,
		Status: "active",
	}

	if err := s.db.Create(member).Error; err != nil {
		return fmt.Errorf("添加成员失败: %w", err)
	}

	return nil
}

// UpdateMemberRole 更新成员角色
func (s *Service) UpdateMemberRole(teamID uint, operatorID uint, memberID uint, req *UpdateMemberRoleRequest) error {
	// 检查操作者权限
	operator, err := s.getTeamMember(teamID, operatorID)
	if err != nil {
		return err
	}

	if !operator.Role.CanManageMembers() {
		return errors.New("权限不足，只有管理员和所有者可以修改成员角色")
	}

	// 检查要修改的成员
	targetMember, err := s.getTeamMember(teamID, memberID)
	if err != nil {
		return err
	}

	// 所有者不能被降级
	if targetMember.Role.IsOwner() && req.Role != model.TeamRoleOwner {
		return errors.New("不能修改所有者的角色")
	}

	// 更新角色
	if err := s.db.Model(&model.TeamMember{}).
		Where("team_id = ? AND user_id = ?", teamID, memberID).
		Update("role", req.Role).Error; err != nil {
		return fmt.Errorf("更新成员角色失败: %w", err)
	}

	return nil
}

// RemoveMember 移除团队成员
func (s *Service) RemoveMember(teamID uint, operatorID uint, memberID uint) error {
	// 检查操作者权限
	operator, err := s.getTeamMember(teamID, operatorID)
	if err != nil {
		return err
	}

	if !operator.Role.CanManageMembers() {
		return errors.New("权限不足，只有管理员和所有者可以移除成员")
	}

	// 检查要移除的成员
	targetMember, err := s.getTeamMember(teamID, memberID)
	if err != nil {
		return err
	}

	// 所有者不能被移除
	if targetMember.Role.IsOwner() {
		return errors.New("不能移除团队所有者")
	}

	// 移除成员
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, memberID).
		Delete(&model.TeamMember{}).Error; err != nil {
		return fmt.Errorf("移除成员失败: %w", err)
	}

	return nil
}

// GetTeamMembers 获取团队成员列表
func (s *Service) GetTeamMembers(teamID uint, userID uint) ([]TeamMemberResponse, error) {
	// 检查用户是否为团队成员
	_, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return nil, err
	}

	var members []model.TeamMember
	if err := s.db.Preload("User").Where("team_id = ?", teamID).Find(&members).Error; err != nil {
		return nil, fmt.Errorf("获取团队成员失败: %w", err)
	}

	var responses []TeamMemberResponse
	for _, member := range members {
		response := TeamMemberResponse{
			ID:        member.ID,
			TeamID:    member.TeamID,
			UserID:    member.UserID,
			Role:      string(member.Role),
			Status:    member.Status,
			JoinedAt:  time.Unix(member.JoinedAt, 0).Format(time.RFC3339),
			CreatedAt: member.CreatedAt.Format(time.RFC3339),
		}
		response.User.ID = member.User.ID
		response.User.Email = member.User.Email
		response.User.Nickname = member.User.Nickname
		response.User.AvatarURL = member.User.AvatarURL

		responses = append(responses, response)
	}

	return responses, nil
}

// LeaveTeam 离开团队
func (s *Service) LeaveTeam(teamID uint, userID uint) error {
	// 检查用户是否为团队成员
	member, err := s.getTeamMember(teamID, userID)
	if err != nil {
		return err
	}

	// 所有者不能离开团队
	if member.Role.IsOwner() {
		return errors.New("团队所有者不能离开团队，请先转让所有权或删除团队")
	}

	// 离开团队
	if err := s.db.Where("team_id = ? AND user_id = ?", teamID, userID).
		Delete(&model.TeamMember{}).Error; err != nil {
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
