import client from '../client'

// tenantappmanagementtranslatedAPItranslated

export interface TenantOAuthClientSummary {
  id: number
  client_id: string
  redirect_uris: string[]
  scopes: string[]
  is_active: boolean
  created_at: string
}

export interface TenantApp {
  id: string | number
  tenant_id: string | number
  name: string
  description: string
  /** Newer backend field name for the app icon */
  icon_url?: string
  logo_url?: string
  homepage_url?: string
  redirect_uris: string[]
  privacy_policy_url?: string
  terms_of_service_url?: string
  is_verified?: boolean
  status: 'active' | 'inactive' | 'pending'
  settings: Record<string, any>
  created_at: string
  updated_at: string
  last_accessed?: string
  oauth_client?: boolean
  oauth_clients?: TenantOAuthClientSummary[]
  stats?: {
    total_users: number
    active_users: number
    requests_today: number
  }
}

export interface CreateTenantAppRequest {
  name: string
  description: string
  logo_url?: string
  homepage_url?: string
  redirect_uris: string[]
  privacy_policy_url?: string
  terms_of_service_url?: string
  is_verified?: boolean
  settings?: Record<string, any>
}

export interface UpdateTenantAppRequest {
  name?: string
  description?: string
  logo_url?: string
  homepage_url?: string
  redirect_uris?: string[]
  privacy_policy_url?: string
  terms_of_service_url?: string
  is_verified?: boolean
  status?: 'active' | 'inactive' | 'pending'
  settings?: Record<string, any>
}

// tenantappmanagementAPI
export const tenantAppApi = {
  // gettenantapplist
  async listTenantApps(page = 1, limit = 20) {
    const response = await client.get('/api/v1/tenant/apps', {
      params: { page, limit }
    })
    return response.data
  },

  // gettenantappdetails
  async getTenantApp(id: string) {
    const response = await client.get(`/api/v1/tenant/apps/${id}`)
    return response.data
  },

  // createtenantapp
  async createTenantApp(data: CreateTenantAppRequest) {
    const response = await client.post('/api/v1/tenant/apps', data)
    return response.data
  },

  // updatetenantapp
  async updateTenantApp(id: string, data: UpdateTenantAppRequest) {
    const response = await client.put(`/api/v1/tenant/apps/${id}`, data)
    return response.data
  },

  // deletetenantapp
  async deleteTenantApp(id: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${id}`)
    return response.data
  },

  // translatedappstatus
  async toggleAppStatus(id: string, status: 'active' | 'inactive') {
    const response = await client.patch(`/api/v1/tenant/apps/${id}/status`, { status })
    return response.data
  },

  // getapptranslatedinfo
  async getAppStats(id: string, period = '7d') {
    const response = await client.get(`/api/v1/tenant/apps/${id}/stats`, {
      params: { period }
    })
    return response.data
  }
}
