import client from '../client'

// appusermanagementtranslatedAPItranslated

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

// appusermanagementAPI
export const appUserApi = {
  // translatedstatusgetappuserlist
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

  // getappusertranslated
  async getAppUserStats(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/stats`)
    return response.data
  },

  // updateuserstatus（translated/translated/translated）- translatedtenantpermission
  async updateUserStatus(appId: string, userId: string, data: UpdateAppUserStatusRequest) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/users/${userId}/status`, data)
    return response.data
  },

  // translatedusertranslated
  async revokeUserAuthorization(appId: string, userId: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}`)
    return response.data
  }
}

export default appUserApi
