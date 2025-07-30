import client from './client'

// 应用用户管理相关的API接口

export interface AppUser {
  id: number
  app_id: number
  user_id: number
  user_email: string
  user_nickname: string
  user_avatar?: string
  first_authorized_at: string
  last_authorized_at: string
  last_active_at?: string
  scopes: string
  status: 'active' | 'banned' | 'suspended' | 'restricted'
  ban_reason?: string
  banned_at?: string
  banned_by_user_id?: number
  banned_until?: string
  created_at: string
  updated_at: string
}

export interface AppUserStats {
  total_users: number
  active_users: number
  new_users: number
}

export interface UpdateAppUserStatusRequest {
  status: 'active' | 'banned' | 'suspended' | 'restricted'
  reason?: string
  ban_until?: string
}

export interface AppUsersResponse {
  users: AppUser[]
  pagination: {
    page: number
    limit: number
    total: number
  }
}

// 应用用户管理API
export const appUserApi = {
  // 获取应用用户列表
  async getAppUsers(appId: string, page = 1, limit = 20) {
    const response = await client.get(`/api/v1/admin/apps/${appId}/users`, {
      params: { page, limit }
    })
    return response.data
  },

  // 根据状态获取应用用户列表
  async getAppUsersByStatus(appId: string, status?: string, page = 1, limit = 20) {
    const params: any = { page, limit }
    if (status) {
      params.status = status
    }
    
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/by-status`, {
      params
    })
    return response.data
  },

  // 获取应用用户统计
  async getAppUserStats(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/stats`)
    return response.data
  },

  // 更新用户状态（封禁/解封/限制）- 使用租户权限
  async updateUserStatus(appId: string, userId: string, data: UpdateAppUserStatusRequest) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/users/${userId}/status`, data)
    return response.data
  },

  // 撤销用户授权
  async revokeUserAuthorization(appId: string, userId: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}`)
    return response.data
  }
}

export default appUserApi
