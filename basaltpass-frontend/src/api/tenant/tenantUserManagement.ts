import client from '../client'

// 租户用户管理相关的API接口

export interface TenantUser {
  id: number
  email: string
  nickname: string
  avatar?: string
  role: 'owner' | 'admin' | 'member'
  status: 'active' | 'inactive' | 'suspended'
  last_login_at?: string
  created_at: string
  updated_at: string
  // 新增字段：同一用户可能使用该租户的多个应用
  app_count?: number
  last_authorized_at?: string
  last_active_at?: string
  is_tenant_admin?: boolean
}

export interface TenantUserStats {
  total_users: number
  active_users: number
  suspended_users: number
  new_users_this_month: number
}

export interface TenantUsersResponse {
  users: TenantUser[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

export interface UpdateTenantUserRequest {
  role?: 'admin' | 'member'
  status?: 'active' | 'inactive' | 'suspended'
}

export interface InviteTenantUserRequest {
  email: string
  role: 'admin' | 'member'
  message?: string
}

// 租户用户管理API
export const tenantUserManagementApi = {
  // 获取租户用户列表
  async getTenantUsers(params?: {
    page?: number
    limit?: number
    search?: string
    role?: string
    status?: string
  }) {
    const response = await client.get('/api/v1/tenant/users', { params })
    return response.data
  },

  // 获取租户用户统计
  async getTenantUserStats() {
    const response = await client.get('/api/v1/tenant/users/stats')
    return response.data
  },

  // 更新用户信息
  async updateTenantUser(userId: number, data: UpdateTenantUserRequest) {
    const response = await client.put(`/api/v1/tenant/users/${userId}`, data)
    return response.data
  },

  // 移除租户用户
  async removeTenantUser(userId: number) {
    const response = await client.delete(`/api/v1/tenant/users/${userId}`)
    return response.data
  },

  // 邀请新用户
  async inviteTenantUser(data: InviteTenantUserRequest) {
    const response = await client.post('/api/v1/tenant/users/invite', data)
    return response.data
  },

  // 重新发送邀请
  async resendInvitation(userId: number) {
    const response = await client.post(`/api/v1/tenant/users/${userId}/resend-invitation`)
    return response.data
  },

  // 获取用户详情
  async getTenantUser(userId: number) {
    const response = await client.get(`/api/v1/tenant/users/${userId}`)
    return response.data
  }
}

export default tenantUserManagementApi
