import client from '../client'

// tenantusermanagementtranslatedAPItranslated

export interface TenantUser {
  id: number
  email: string
  nickname: string
  avatar?: string
  role: 'owner' | 'admin' | 'member' | 'user'
  status: 'active' | 'inactive' | 'suspended'
  last_login_at?: string
  created_at: string
  updated_at: string
  // translated：translatedusercantranslatedtenanttranslatedapp
  app_count?: number
  last_authorized_at?: string
  last_active_at?: string
  is_tenant_user?: boolean
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
  role?: 'admin' | 'user'
  status?: 'active' | 'inactive' | 'suspended'
}

export interface InviteTenantUserRequest {
  email: string
  role: 'admin' | 'user'
  message?: string
}

// tenantusermanagementAPI
export const tenantUserManagementApi = {
  // gettenantuserlist
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

  // gettenantusertranslated
  async getTenantUserStats() {
    const response = await client.get('/api/v1/tenant/users/stats')
    return response.data
  },

  // updateuserinfo
  async updateTenantUser(userId: number, data: UpdateTenantUserRequest) {
    const response = await client.put(`/api/v1/tenant/users/${userId}`, data)
    return response.data
  },

  // translatedtenantuser
  async removeTenantUser(userId: number) {
    const response = await client.delete(`/api/v1/tenant/users/${userId}`)
    return response.data
  },

  // invitationtranslateduser
  async inviteTenantUser(data: InviteTenantUserRequest) {
    const response = await client.post('/api/v1/tenant/users/invite', data)
    return response.data
  },

  // translatedinvitation
  async resendInvitation(userId: number) {
    const response = await client.post(`/api/v1/tenant/users/${userId}/resend-invitation`)
    return response.data
  },

  // getuserdetails
  async getTenantUser(userId: number) {
    const response = await client.get(`/api/v1/tenant/users/${userId}`)
    return response.data
  }
}

export default tenantUserManagementApi
