import client from '../client'

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

// 租户管理员API (/admin)
export const tenantApi = {
  // 获取当前租户详细信息（控制台专用）
  async getTenantInfo(): Promise<{ data: TenantInfo }> {
    const response = await client.get('/api/v1/tenant/info')
    return response.data
  },

  // 调试用户状态 - 临时调试方法
  async debugUserStatus() {
    const response = await client.get('/api/v1/user/debug')
    return response.data
  },
}

// 租户级别API (/tenant) - 用于租户自己获取信息
export const tenantSelfApi = {
  // 获取当前租户信息
  async getTenantInfo(): Promise<{ data: TenantInfo }> {
    const response = await client.get('/api/v1/tenant/info')
    return response.data
  }
}
