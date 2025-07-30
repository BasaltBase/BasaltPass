import client from './client'

// 租户OAuth客户端管理相关的API接口

export interface TenantOAuthClient {
  id: number
  client_id: string
  redirect_uris: string[]
  scopes: string[]
  is_active: boolean
  created_at: string
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

// 租户OAuth客户端管理API
export const tenantOAuthApi = {
  // 获取租户应用和OAuth客户端列表
  async listAppsWithClients(page = 1, limit = 20, search = '') {
    const response = await client.get('/api/v1/tenant/oauth/clients', {
      params: { page, page_size: limit, search }
    })
    return response.data
  },

  // 为应用创建OAuth客户端
  async createClient(data: CreateTenantOAuthClientRequest) {
    const response = await client.post('/api/v1/tenant/oauth/clients', data)
    return response.data
  },

  // 更新OAuth客户端
  async updateClient(clientId: string, data: UpdateTenantOAuthClientRequest) {
    const response = await client.put(`/api/v1/tenant/oauth/clients/${clientId}`, data)
    return response.data
  },

  // 删除OAuth客户端
  async deleteClient(clientId: string) {
    const response = await client.delete(`/api/v1/tenant/oauth/clients/${clientId}`)
    return response.data
  },

  // 重新生成客户端密钥
  async regenerateSecret(clientId: string) {
    const response = await client.post(`/api/v1/tenant/oauth/clients/${clientId}/regenerate-secret`)
    return response.data
  }
}
