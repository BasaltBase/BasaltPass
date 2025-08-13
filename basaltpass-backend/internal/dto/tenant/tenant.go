package admindto

import "time"

// AdminTenantListRequest 管理员租户列表请求
type AdminTenantListRequest struct {
	Page         int        `query:"page" validate:"min=1"`
	Limit        int        `query:"limit" validate:"min=1,max=100"`
	Search       string     `query:"search"`
	Status       string     `query:"status"` // active, suspended, deleted
	Plan         string     `query:"plan"`   // free, pro, enterprise
	SortBy       string     `query:"sort_by"`
	SortOrder    string     `query:"sort_order"` // asc, desc
	CreatedStart *time.Time `query:"created_start"`
	CreatedEnd   *time.Time `query:"created_end"`
}

// AdminCreateTenantRequest 管理员创建租户请求
type AdminCreateTenantRequest struct {
	Name        string         `json:"name" validate:"required,min=2,max=100"`
	Code        string         `json:"code" validate:"required,min=2,max=50,alphanum"`
	Description string         `json:"description" validate:"max=500"`
	Plan        string         `json:"plan" validate:"required,oneof=free pro enterprise"`
	OwnerEmail  string         `json:"owner_email" validate:"required,email"`
	Settings    TenantSettings `json:"settings"`
}

// AdminUpdateTenantRequest 管理员更新租户请求
type AdminUpdateTenantRequest struct {
	Name        *string         `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	Description *string         `json:"description,omitempty" validate:"omitempty,max=500"`
	Plan        *string         `json:"plan,omitempty" validate:"omitempty,oneof=free pro enterprise"`
	Status      *string         `json:"status,omitempty" validate:"omitempty,oneof=active suspended deleted"`
	Settings    *TenantSettings `json:"settings,omitempty"`
}

// AdminTenantUserListRequest 管理员租户用户列表请求
type AdminTenantUserListRequest struct {
	Page     int    `query:"page" validate:"min=1"`
	Limit    int    `query:"limit" validate:"min=1,max=100"`
	Search   string `query:"search"`
	UserType string `query:"user_type"` // tenant_admin, app_user, all
	Role     string `query:"role"`      // owner, tenant, member
	Status   string `query:"status"`    // active, suspended, banned
}

// AdminTenantListResponse 管理员租户列表响应
type AdminTenantListResponse struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	Plan        string    `json:"plan"`
	Status      string    `json:"status"`
	OwnerID     uint      `json:"owner_id"`
	OwnerEmail  string    `json:"owner_email"`
	OwnerName   string    `json:"owner_name"`
	UserCount   int64     `json:"user_count"`
	AppCount    int64     `json:"app_count"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// AdminTenantDetailResponse 管理员租户详情响应
type AdminTenantDetailResponse struct {
	AdminTenantListResponse
	Settings    TenantSettings `json:"settings"`
	Stats       TenantStats    `json:"stats"`
	RecentUsers []RecentUser   `json:"recent_users"`
	RecentApps  []RecentApp    `json:"recent_apps"`
}

// TenantListResponse 租户列表响应
type TenantListResponse struct {
	Tenants    []AdminTenantListResponse `json:"tenants"`
	Pagination PaginationResponse        `json:"pagination"`
}

// TenantStatsResponse 租户统计响应
type TenantStatsResponse struct {
	TotalTenants          int64 `json:"total_tenants"`
	ActiveTenants         int64 `json:"active_tenants"`
	SuspendedTenants      int64 `json:"suspended_tenants"`
	DeletedTenants        int64 `json:"deleted_tenants"`
	FreePlanTenants       int64 `json:"free_plan_tenants"`
	ProPlanTenants        int64 `json:"pro_plan_tenants"`
	EnterprisePlanTenants int64 `json:"enterprise_plan_tenants"`
	NewTenantsToday       int64 `json:"new_tenants_today"`
	NewTenantsThisWeek    int64 `json:"new_tenants_this_week"`
	NewTenantsThisMonth   int64 `json:"new_tenants_this_month"`
}

// AdminTenantUserListResponse 管理员租户用户列表响应
type AdminTenantUserListResponse struct {
	Users      []AdminTenantUser  `json:"users"`
	Pagination PaginationResponse `json:"pagination"`
}

// AdminTenantUser 管理员租户用户信息
type AdminTenantUser struct {
	ID           uint       `json:"id"`
	Email        string     `json:"email"`
	Nickname     string     `json:"nickname"`
	Role         string     `json:"role"`      // owner, tenant, member
	UserType     string     `json:"user_type"` // tenant_admin, app_user
	Status       string     `json:"status"`    // active, suspended, banned
	AppName      *string    `json:"app_name,omitempty"`
	LastActiveAt *time.Time `json:"last_active_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// TenantSettings 租户设置
type TenantSettings struct {
	MaxUsers    int  `json:"max_users"`
	MaxApps     int  `json:"max_apps"`
	MaxStorage  int  `json:"max_storage"` // MB
	EnableAPI   bool `json:"enable_api"`
	EnableSSO   bool `json:"enable_sso"`
	EnableAudit bool `json:"enable_audit"`
}

// TenantStats 租户统计
type TenantStats struct {
	TotalUsers        int64      `json:"total_users"`
	ActiveUsers       int64      `json:"active_users"`
	TotalApps         int64      `json:"total_apps"`
	ActiveApps        int64      `json:"active_apps"`
	StorageUsed       int64      `json:"storage_used"` // MB
	APICallsThisMonth int64      `json:"api_calls_this_month"`
	LastActiveAt      *time.Time `json:"last_active_at"`
}

// RecentUser 最近用户
type RecentUser struct {
	ID        uint      `json:"id"`
	Email     string    `json:"email"`
	Nickname  string    `json:"nickname"`
	CreatedAt time.Time `json:"created_at"`
}

// RecentApp 最近应用
type RecentApp struct {
	ID          uint      `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}

// PaginationResponse 分页响应
type PaginationResponse struct {
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	Total      int64 `json:"total"`
	TotalPages int   `json:"total_pages"`
}
