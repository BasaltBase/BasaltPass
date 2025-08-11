package user

import (
	"time"
)

// AdminUserListResponse 管理员用户列表响应
type AdminUserListResponse struct {
	ID                uint               `json:"id"`
	Email             string             `json:"email"`
	Phone             string             `json:"phone"`
	Nickname          string             `json:"nickname"`
	AvatarURL         string             `json:"avatar_url"`
	EmailVerified     bool               `json:"email_verified"`
	PhoneVerified     bool               `json:"phone_verified"`
	TwoFAEnabled      bool               `json:"two_fa_enabled"`
	Banned            bool               `json:"banned"`
	LastLoginAt       *time.Time         `json:"last_login_at"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	TenantMemberships []TenantMembership `json:"tenant_memberships"`
	GlobalRoles       []GlobalRole       `json:"global_roles"`
}

// TenantMembership 租户成员信息
type TenantMembership struct {
	TenantID   uint      `json:"tenant_id"`
	TenantName string    `json:"tenant_name"`
	TenantCode string    `json:"tenant_code"`
	Role       string    `json:"role"`
	JoinedAt   time.Time `json:"joined_at"`
}

// GlobalRole 全局角色信息
type GlobalRole struct {
	ID          uint   `json:"id"`
	Name        string `json:"name"`
	Code        string `json:"code"`
	Description string `json:"description"`
}

// AdminUserDetailResponse 管理员用户详情响应
type AdminUserDetailResponse struct {
	AdminUserListResponse
	AppAuthorizations []AppAuthorization `json:"app_authorizations"`
	ActivityStats     ActivityStats      `json:"activity_stats"`
}

// AppAuthorization 应用授权信息
type AppAuthorization struct {
	AppID             uint       `json:"app_id"`
	AppName           string     `json:"app_name"`
	TenantID          uint       `json:"tenant_id"`
	TenantName        string     `json:"tenant_name"`
	Status            string     `json:"status"`
	FirstAuthorizedAt time.Time  `json:"first_authorized_at"`
	LastActiveAt      *time.Time `json:"last_active_at"`
	Scopes            string     `json:"scopes"`
}

// ActivityStats 活动统计
type ActivityStats struct {
	TotalLogins        int64      `json:"total_logins"`
	LastLoginAt        *time.Time `json:"last_login_at"`
	TotalAppsUsed      int64      `json:"total_apps_used"`
	ActiveAppsCount    int64      `json:"active_apps_count"`
	TeamsCount         int64      `json:"teams_count"`
	SubscriptionsCount int64      `json:"subscriptions_count"`
}

// UpdateUserRequest 更新用户请求
type UpdateUserRequest struct {
	Email     *string `json:"email,omitempty"`
	Phone     *string `json:"phone,omitempty"`
	Nickname  *string `json:"nickname,omitempty"`
	AvatarURL *string `json:"avatar_url,omitempty"`
	Banned    *bool   `json:"banned,omitempty"`
}

// BanUserRequest 封禁用户请求
type BanUserRequest struct {
	Banned   bool       `json:"banned"`
	Reason   string     `json:"reason,omitempty"`
	BanUntil *time.Time `json:"ban_until,omitempty"`
	Comment  string     `json:"comment,omitempty"`
}

// AdminUserListRequest 管理员用户列表查询请求
type AdminUserListRequest struct {
	Page         int        `query:"page"`
	Limit        int        `query:"limit"`
	Search       string     `query:"search"`        // 搜索关键词（邮箱、电话、昵称）
	Status       string     `query:"status"`        // 状态筛选：all, active, banned, verified, unverified
	TenantID     *uint      `query:"tenant_id"`     // 按租户筛选
	Role         string     `query:"role"`          // 按角色筛选
	SortBy       string     `query:"sort_by"`       // 排序字段：created_at, last_login, email
	SortOrder    string     `query:"sort_order"`    // 排序顺序：asc, desc
	CreatedStart *time.Time `query:"created_start"` // 创建时间筛选开始
	CreatedEnd   *time.Time `query:"created_end"`   // 创建时间筛选结束
}

// UserStatsResponse 用户统计响应
type UserStatsResponse struct {
	TotalUsers        int64 `json:"total_users"`
	ActiveUsers       int64 `json:"active_users"`
	BannedUsers       int64 `json:"banned_users"`
	VerifiedUsers     int64 `json:"verified_users"`
	TwoFAEnabledUsers int64 `json:"two_fa_enabled_users"`
	NewUsersToday     int64 `json:"new_users_today"`
	NewUsersThisWeek  int64 `json:"new_users_this_week"`
	NewUsersThisMonth int64 `json:"new_users_this_month"`
}

// AssignGlobalRoleRequest 分配全局角色请求
type AssignGlobalRoleRequest struct {
	RoleID uint `json:"role_id" validate:"required"`
}

// RemoveGlobalRoleRequest 移除全局角色请求
type RemoveGlobalRoleRequest struct {
	RoleID uint `json:"role_id" validate:"required"`
}

// UserListResponse 用户列表响应结构
type UserListResponse struct {
	Users      []AdminUserListResponse `json:"users"`
	Pagination PaginationResponse      `json:"pagination"`
}

// PaginationResponse 分页响应
type PaginationResponse struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}

// AdminCreateUserRequest 管理员创建用户请求
type AdminCreateUserRequest struct {
	Email         string `json:"email" validate:"required,email"`
	Phone         string `json:"phone"`
	Password      string `json:"password" validate:"required,min=6"`
	Nickname      string `json:"nickname"`
	EmailVerified bool   `json:"email_verified"`
	PhoneVerified bool   `json:"phone_verified"`
	RoleIDs       []uint `json:"role_ids"`
}
