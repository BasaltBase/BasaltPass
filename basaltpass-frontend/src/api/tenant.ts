import client from './client'

// 租户相关的API接口

export interface Tenant {
  id: number | string
  name: string
  code?: string
  description?: string
  domain?: string
  plan: 'free' | 'pro' | 'enterprise'
  status?: 'active' | 'suspended' | 'deleted'
  owner_id?: string
  settings?: Record<string, any>
  created_at: string
  updated_at: string
  deleted_at?: string
}

export interface TenantInfo {
  id: number
  name: string
  code: string
  description: string
  status: 'active' | 'suspended' | 'deleted'
  plan: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
  stats: TenantDetailStats
  quota?: TenantQuotaInfo
}

export interface TenantDetailStats {
  total_users: number
  total_apps: number
  active_apps: number
  total_clients: number
  active_tokens: number
}

export interface TenantQuotaInfo {
  max_apps: number
  max_users: number
  max_tokens_per_hour: number
}

export interface CreateTenantRequest {
  name: string
  domain: string
  plan: 'free' | 'basic' | 'premium' | 'enterprise'
  settings?: Record<string, any>
}

export interface UpdateTenantRequest {
  name?: string
  domain?: string
  plan?: 'free' | 'basic' | 'premium' | 'enterprise'
  status?: 'active' | 'suspended' | 'deleted'
  settings?: Record<string, any>
}

export interface TenantQuota {
  id: string
  tenant_id: string
  max_users: number
  max_apps: number
  max_requests_per_month: number
  used_users: number
  used_apps: number
  used_requests_this_month: number
  created_at: string
  updated_at: string
}

export interface UserTenant {
  id: string
  user_id: string
  tenant_id: string
  role: string
  status: 'active' | 'suspended' | 'pending'
  created_at: string
  updated_at: string
  tenant?: Tenant
}

// 平台管理员API (/_admin)
export const platformApi = {
  // 租户管理
  async listTenants(page = 1, limit = 20) {
    const response = await client.get('/_admin/tenants', {
      params: { page, limit }
    })
    return response.data.data || response.data
  },

  async getTenant(id: string) {
    const response = await client.get(`/_admin/tenants/${id}`)
    return response.data.data || response.data
  },

  async createTenant(data: CreateTenantRequest) {
    const response = await client.post('/_admin/tenants', data)
    return response.data.data || response.data
  },

  async updateTenant(id: string, data: UpdateTenantRequest) {
    const response = await client.put(`/_admin/tenants/${id}`, data)
    return response.data.data || response.data
  },

  async deleteTenant(id: string) {
    const response = await client.delete(`/_admin/tenants/${id}`)
    return response.data.data || response.data
  },

  async getTenantQuota(id: string) {
    const response = await client.get(`/_admin/tenants/${id}/quota`)
    return response.data
  },

  async updateTenantQuota(id: string, quota: Partial<TenantQuota>) {
    const response = await client.put(`/_admin/tenants/${id}/quota`, quota)
    return response.data
  },

  // 租户用户管理
  async listTenantUsers(tenantId: string, page = 1, limit = 20) {
    const response = await client.get(`/_admin/tenants/${tenantId}/users`, {
      params: { page, limit }
    })
    return response.data
  },

  async addUserToTenant(tenantId: string, userId: string, role: string) {
    const response = await client.post(`/_admin/tenants/${tenantId}/users`, {
      user_id: userId,
      role
    })
    return response.data
  },

  async removeUserFromTenant(tenantId: string, userId: string) {
    const response = await client.delete(`/_admin/tenants/${tenantId}/users/${userId}`)
    return response.data
  },

  async updateUserTenantRole(tenantId: string, userId: string, role: string) {
    const response = await client.put(`/_admin/tenants/${tenantId}/users/${userId}`, {
      role
    })
    return response.data
  }
}

// 租户管理员API (/admin)
export const tenantApi = {
  // 获取当前租户信息
  async getCurrentTenant() {
    const response = await client.get('/api/v1/admin/tenant')
    return response.data
  },

  // 获取当前租户详细信息（控制台专用）
  async getTenantInfo(): Promise<{ data: TenantInfo }> {
    const response = await client.get('/api/v1/admin/tenant/info')
    return response.data
  },

  // 调试用户状态 - 临时调试方法
  async debugUserStatus() {
    const response = await client.get('/api/v1/user/debug')
    return response.data
  },

  async updateCurrentTenant(data: UpdateTenantRequest) {
    const response = await client.put('/api/v1/admin/tenant', data)
    return response.data
  },

  async getCurrentTenantQuota() {
    const response = await client.get('/admin/tenant/quota')
    return response.data
  },

  // 租户用户管理
  async listUsers(page = 1, limit = 20) {
    const response = await client.get('/admin/users', {
      params: { page, limit }
    })
    return response.data
  },

  async inviteUser(email: string, role: string) {
    const response = await client.post('/admin/users/invite', {
      email,
      role
    })
    return response.data
  },

  async updateUserRole(userId: string, role: string) {
    const response = await client.put(`/admin/users/${userId}/role`, {
      role
    })
    return response.data
  },

  async removeUser(userId: string) {
    const response = await client.delete(`/admin/users/${userId}`)
    return response.data
  }
}
