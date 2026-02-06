import client from '../client'

// 应用相关的API接口

export interface App {
  id: string
  tenant_id: string
  name: string
  description: string
  logo_url?: string
  homepage_url?: string
  callback_urls: string[]
  privacy_policy_url?: string
  terms_of_service_url?: string
  status: 'active' | 'inactive' | 'suspended'
  settings: Record<string, any>
  created_at: string
  updated_at: string
  oauth_client?: OAuthClientInfo
}

export interface OAuthClientInfo {
  id: string
  client_id: string
  client_secret: string
  client_type: 'public' | 'confidential'
  grant_types: string[]
  response_types: string[]
  scopes: string[]
  redirect_uris: string[]
  created_at: string
  updated_at: string
}

export interface CreateAppRequest {
  name: string
  description: string
  logo_url?: string
  homepage_url?: string
  callback_urls: string[]
  privacy_policy_url?: string
  terms_of_service_url?: string
  settings?: Record<string, any>
}

export interface UpdateAppRequest {
  name?: string
  description?: string
  logo_url?: string
  homepage_url?: string
  callback_urls?: string[]
  privacy_policy_url?: string
  terms_of_service_url?: string
  status?: 'active' | 'inactive' | 'suspended'
  settings?: Record<string, any>
}

export interface CreateOAuthClientRequest {
  app_id: string
  client_type: 'public' | 'confidential'
  grant_types: string[]
  response_types: string[]
  scopes: string[]
  redirect_uris: string[]
}

export interface UpdateOAuthClientRequest {
  grant_types?: string[]
  response_types?: string[]
  scopes?: string[]
  redirect_uris?: string[]
}

// 应用管理API
export const appApi = {
  // 应用CRUD
  async listApps(page = 1, limit = 20) {
    const response = await client.get('/api/v1/admin/apps', {
      params: { page, limit }
    })
    return response.data
  },

  async getApp(id: string) {
    const response = await client.get(`/api/v1/admin/apps/${id}`)
    return response.data
  },

  async createApp(data: CreateAppRequest) {
    const response = await client.post('/api/v1/admin/apps', data)
    return response.data
  },

  async updateApp(id: string, data: UpdateAppRequest) {
    const response = await client.put(`/api/v1/admin/apps/${id}`, data)
    return response.data
  },

  async deleteApp(id: string) {
    const response = await client.delete(`/api/v1/admin/apps/${id}`)
    return response.data
  },

  // OAuth客户端管理
  async createOAuthClient(data: CreateOAuthClientRequest) {
    const response = await client.post('/admin/oauth-clients', data)
    return response.data
  },

  async getOAuthClient(appId: string) {
    const response = await client.get(`/admin/apps/${appId}/oauth-client`)
    return response.data
  },

  async updateOAuthClient(clientId: string, data: UpdateOAuthClientRequest) {
    const response = await client.put(`/admin/oauth-clients/${clientId}`, data)
    return response.data
  },

  async regenerateClientSecret(clientId: string) {
    const response = await client.post(`/admin/oauth-clients/${clientId}/regenerate-secret`)
    return response.data
  },

  async deleteOAuthClient(clientId: string) {
    const response = await client.delete(`/admin/oauth-clients/${clientId}`)
    return response.data
  },

  // 应用统计
  async getAppStats(appId: string, period = '30d') {
    const response = await client.get(`/admin/apps/${appId}/stats`, {
      params: { period }
    })
    return response.data
  },

  async getAppTokens(appId: string, page = 1, limit = 20) {
    const response = await client.get(`/admin/apps/${appId}/tokens`, {
      params: { page, limit }
    })
    return response.data
  },

  async revokeAppToken(appId: string, tokenId: string) {
    const response = await client.delete(`/admin/apps/${appId}/tokens/${tokenId}`)
    return response.data
  }
}