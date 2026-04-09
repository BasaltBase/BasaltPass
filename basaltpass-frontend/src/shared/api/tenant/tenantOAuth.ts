import client from '../client'

// tenantOAuthtranslatedmanagementtranslatedAPItranslated

export interface TenantOAuthClient {
  id: number
  client_id: string
  client_secret?: string
  redirect_uris: string[]
  scopes: string[]
  is_active: boolean
  created_at: string
}

export interface CreateTenantOAuthClientResponse {
  data: {
    client: TenantOAuthClient
    app: TenantAppWithClients
  }
  message?: string
}

export interface TenantAppWithClients {
  id: number
  tenant_id: number
  name: string
  description: string
  icon_url?: string
  status: 'active' | 'inactive' | 'deleted'
  created_at: string
  updated_at: string
  oauth_clients: TenantOAuthClient[]
}

export interface CreateTenantOAuthClientRequest {
  app_id: number
  name: string
  description?: string
  redirect_uris: string[]
  scopes?: string[]
  allowed_origins?: string[]
}

export interface UpdateTenantOAuthClientRequest {
  name?: string
  description?: string
  redirect_uris?: string[]
  scopes?: string[]
  allowed_origins?: string[]
  is_active?: boolean
}

export interface OAuthScopeMeta {
  scope: string
  title: string
  description: string
  category: string
}

export interface ListOAuthScopesResponse {
  data: {
    scopes: OAuthScopeMeta[]
    defaults: string[]
  }
}

// tenantOAuthtranslatedmanagementAPI
export const tenantOAuthApi = {
  // gettenantappandOAuthtranslatedlist
  async listAppsWithClients(page = 1, limit = 20, search = '') {
    const response = await client.get('/api/v1/tenant/oauth/clients', {
      params: { page, page_size: limit, search }
    })
    return response.data
  },

  // translatedappcreateOAuthtranslated
  async createClient(data: CreateTenantOAuthClientRequest) {
    const response = await client.post<CreateTenantOAuthClientResponse>('/api/v1/tenant/oauth/clients', data)
    return response.data
  },

  // updateOAuthtranslated
  async updateClient(clientId: string, data: UpdateTenantOAuthClientRequest) {
    const response = await client.put(`/api/v1/tenant/oauth/clients/${clientId}`, data)
    return response.data
  },

  // deleteOAuthtranslated
  async deleteClient(clientId: string) {
    const response = await client.delete(`/api/v1/tenant/oauth/clients/${clientId}`)
    return response.data
  },

  // translated
  async regenerateSecret(clientId: string) {
    const response = await client.post(`/api/v1/tenant/oauth/clients/${clientId}/regenerate-secret`)
    return response.data
  },

  // getcantranslated scopes（translated）
  async listScopes() {
    const response = await client.get<ListOAuthScopesResponse>('/api/v1/tenant/oauth/scopes')
    return response.data
  }
}
