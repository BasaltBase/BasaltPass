package team

import "basaltpass-backend/internal/model"

// ListTeamsRequest 团队列表查询参数
type ListTeamsRequest struct {
	Page    int    `query:"page"`
	Limit   int    `query:"limit"`
	Keyword string `query:"keyword"`
}

type TeamBrief struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatar_url"`
	IsActive    bool   `json:"is_active"`
	MemberCount int    `json:"member_count"`
	CreatedAt   string `json:"created_at"`
}

type ListTeamsResponse struct {
	Teams []TeamBrief `json:"teams"`
	Total int         `json:"total"`
}

type AdminUpdateTeamRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatar_url"`
	IsActive    *bool  `json:"is_active"`
}

// AdminCreateTeamRequest 创建团队
type AdminCreateTeamRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	AvatarURL   string `json:"avatar_url"`
	OwnerUserID uint   `json:"owner_user_id"`
}

type TeamMemberResponse struct {
	ID        uint   `json:"id"`
	TeamID    uint   `json:"team_id"`
	UserID    uint   `json:"user_id"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	JoinedAt  string `json:"joined_at"`
	CreatedAt string `json:"created_at"`
	User      struct {
		ID        uint   `json:"id"`
		Email     string `json:"email"`
		Nickname  string `json:"nickname"`
		AvatarURL string `json:"avatar_url"`
	} `json:"user"`
}

type AddMemberRequest struct {
	UserID uint           `json:"user_id"`
	Role   model.TeamRole `json:"role"`
}
