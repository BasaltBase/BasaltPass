import client from '../client'

// tenanttranslatedAPItranslated

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

export interface LivenessCheckResponse {
  ok: boolean
  scope: 'admin' | 'tenant' | string
  message: string
  checked_at: string
}

// tenantmanagementtranslatedAPI (/admin)
export const tenantApi = {
  // gettranslatedtenanttranslatedinfo（translated）
  async getTenantInfo(): Promise<{ data: TenantInfo }> {
    const response = await client.get('/api/v1/tenant/info')
    return response.data
  },

  // translateduserstatus - translated
  async debugUserStatus() {
    const response = await client.get('/api/v1/user/debug')
    return response.data
  },

  async triggerLivenessCheck(): Promise<LivenessCheckResponse> {
    const response = await client.post<LivenessCheckResponse>('/api/v1/tenant/liveness-check')
    return response.data
  },
}

// tenanttranslatedAPI (/tenant) - translatedtenanttranslatedgetinfo
export const tenantSelfApi = {
  // gettranslatedtenantinfo
  async getTenantInfo(): Promise<{ data: TenantInfo }> {
    const response = await client.get('/api/v1/tenant/info')
    return response.data
  }
}
