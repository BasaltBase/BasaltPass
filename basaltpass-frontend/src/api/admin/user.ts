import client from '../client'

// 用户相关接口定义
export interface AdminUser {
  id: number
  email: string
  phone: string
  nickname: string
  avatar_url: string
  email_verified: boolean
  phone_verified: boolean
  two_fa_enabled: boolean
  banned: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
  tenant_memberships: TenantMembership[]
  global_roles: GlobalRole[]
}

export interface TenantMembership {
  tenant_id: number
  tenant_name: string
  tenant_code: string
  role: string
  joined_at: string
}

export interface GlobalRole {
  id: number
  name: string
  code: string
  description: string
}

export interface AdminUserDetail extends AdminUser {
  app_authorizations: AppAuthorization[]
  activity_stats: ActivityStats
}

export interface AppAuthorization {
  app_id: number
  app_name: string
  tenant_id: number
  tenant_name: string
  status: string
  first_authorized_at: string
  last_active_at?: string
  scopes: string
}

export interface ActivityStats {
  total_logins: number
  last_login_at?: string
  total_apps_used: number
  active_apps_count: number
  teams_count: number
  subscriptions_count: number
}

export interface UserListResponse {
  users: AdminUser[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

export interface UserStats {
  total_users: number
  active_users: number
  banned_users: number
  verified_users: number
  two_fa_enabled_users: number
  new_users_today: number
  new_users_this_week: number
  new_users_this_month: number
}

export interface UserListParams {
  page?: number
  limit?: number
  search?: string
  status?: 'all' | 'active' | 'banned' | 'verified' | 'unverified'
  tenant_id?: number
  role?: string
  sort_by?: 'created_at' | 'last_login' | 'email'
  sort_order?: 'asc' | 'desc'
  created_start?: string
  created_end?: string
}

export interface UpdateUserRequest {
  email?: string
  phone?: string
  nickname?: string
  avatar_url?: string
  banned?: boolean
}

export interface BanUserRequest {
  banned: boolean
  reason?: string
  ban_until?: string
  comment?: string
}

export interface AssignGlobalRoleRequest {
  role_id: number
}

export interface CreateUserRequest {
  email: string
  phone?: string
  password: string
  nickname?: string
  email_verified?: boolean
  phone_verified?: boolean
  role_ids?: number[]
}

// Admin用户管理API
export const adminUserApi = {
  // 获取用户列表
  async getUsers(params: UserListParams = {}) {
    const response = await client.get('/api/v1/admin/users', { params })
    return response.data as UserListResponse
  },

  // 获取用户详情
  async getUser(id: number) {
    const response = await client.get(`/api/v1/admin/users/${id}`)
    return response.data as AdminUserDetail
  },

  // 更新用户信息
  async updateUser(id: number, data: UpdateUserRequest) {
    const response = await client.put(`/api/v1/admin/users/${id}`, data)
    return response.data
  },

  // 封禁/解封用户
  async banUser(id: number, data: BanUserRequest) {
    const response = await client.post(`/api/v1/admin/users/${id}/ban`, data)
    return response.data
  },

  // 删除用户
  async deleteUser(id: number) {
    const response = await client.delete(`/api/v1/admin/users/${id}`)
    return response.data
  },

  // 获取用户统计
  async getUserStats() {
    const response = await client.get('/api/v1/admin/users/stats')
    return response.data as UserStats
  },

  // 分配全局角色
  async assignGlobalRole(id: number, data: AssignGlobalRoleRequest) {
    const response = await client.post(`/api/v1/admin/users/${id}/roles`, data)
    return response.data
  },

  // 移除全局角色
  async removeGlobalRole(id: number, roleId: number) {
    const response = await client.delete(`/api/v1/admin/users/${id}/roles/${roleId}`)
    return response.data
  },

  // 创建用户
  async createUser(data: CreateUserRequest) {
    const response = await client.post('/api/v1/admin/users', data)
    return response.data as AdminUser
  }
}
