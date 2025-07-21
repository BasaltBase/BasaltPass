package team

import "basaltpass-backend/internal/model"

// CreateTeamRequest 创建团队请求
type CreateTeamRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=100"`
	Description string `json:"description" validate:"max=500"`
	AvatarURL   string `json:"avatar_url" validate:"omitempty,url"`
}

// UpdateTeamRequest 更新团队请求
type UpdateTeamRequest struct {
	Name        string `json:"name" validate:"omitempty,min=1,max=100"`
	Description string `json:"description" validate:"omitempty,max=500"`
	AvatarURL   string `json:"avatar_url" validate:"omitempty,url"`
}

// TeamResponse 团队响应
type TeamResponse struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatar_url"`
	IsActive    bool   `json:"is_active"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`

	// 成员统计
	MemberCount int `json:"member_count"`

	// 当前用户在团队中的角色
	UserRole *string `json:"user_role,omitempty"`
}

// TeamMemberResponse 团队成员响应
type TeamMemberResponse struct {
	ID        uint   `json:"id"`
	TeamID    uint   `json:"team_id"`
	UserID    uint   `json:"user_id"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	JoinedAt  string `json:"joined_at"`
	CreatedAt string `json:"created_at"`

	// 用户信息
	User struct {
		ID        uint   `json:"id"`
		Email     string `json:"email"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
	} `json:"user"`
}

// AddMemberRequest 添加成员请求
type AddMemberRequest struct {
	UserID uint           `json:"user_id" validate:"required"`
	Role   model.TeamRole `json:"role" validate:"required,oneof=owner admin member"`
}

// UpdateMemberRoleRequest 更新成员角色请求
type UpdateMemberRoleRequest struct {
	Role model.TeamRole `json:"role" validate:"required,oneof=owner admin member"`
}

// TeamListResponse 团队列表响应
type TeamListResponse struct {
	Teams []TeamResponse `json:"teams"`
	Total int            `json:"total"`
}

// TeamMemberListResponse 团队成员列表响应
type TeamMemberListResponse struct {
	Members []TeamMemberResponse `json:"members"`
	Total   int                  `json:"total"`
}

// UserTeamResponse 用户的团队信息
type UserTeamResponse struct {
	TeamID   uint   `json:"team_id"`
	TeamName string `json:"team_name"`
	Role     string `json:"role"`
	JoinedAt string `json:"joined_at"`
}
