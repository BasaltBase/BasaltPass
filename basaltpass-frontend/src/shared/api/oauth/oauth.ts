import client from '../client'

// OAuth2客户端类型定义
export interface OAuthClient {
  id: number
  name: string
  description: string
  client_id: string
  client_secret?: string
  redirect_uris: string[]
  scopes: string[]
  allowed_origins: string[]
  is_active: boolean
  last_used_at?: string
  created_by: number
  created_at: string
  updated_at: string
  creator?: {
    id: number
    email: string
    nickname: string
  }
}

export interface CreateClientRequest {
  name: string
  description?: string
  redirect_uris: string[]
  scopes?: string[]
  allowed_origins?: string[]
}

export interface UpdateClientRequest {
  name?: string
  description?: string
  redirect_uris?: string[]
  scopes?: string[]
  allowed_origins?: string[]
  is_active?: boolean
}

export interface ClientListResponse {
  clients: OAuthClient[]
  total: number
  page: number
  page_size: number
}

export interface ClientStats {
  total_authorizations: number
  active_tokens: number
  total_users: number
}

// OAuth2客户端管理API
export const oauthApi = {
  // 获取客户端列表
  listClients(page = 1, pageSize = 10, search = '') {
    return client.get<{ data: ClientListResponse }>('/api/v1/admin/oauth/clients', {
      params: { page, page_size: pageSize, search }
    })
  },

  // 创建客户端
  createClient(data: CreateClientRequest) {
    return client.post<{ data: OAuthClient; message: string }>('/api/v1/admin/oauth/clients', data)
  },

  // 获取客户端详情
  getClient(clientId: string) {
    return client.get<{ data: OAuthClient }>(`/api/v1/admin/oauth/clients/${clientId}`)
  },

  // 更新客户端
  updateClient(clientId: string, data: UpdateClientRequest) {
    return client.put<{ data: OAuthClient; message: string }>(`/api/v1/admin/oauth/clients/${clientId}`, data)
  },

  // 删除客户端
  deleteClient(clientId: string) {
    return client.delete<{ message: string }>(`/api/v1/admin/oauth/clients/${clientId}`)
  },

  // 重新生成客户端密钥
  regenerateSecret(clientId: string) {
    return client.post<{ data: { client_secret: string }; message: string }>(`/api/v1/admin/oauth/clients/${clientId}/regenerate-secret`)
  },

  // 获取客户端统计信息
  getClientStats(clientId: string) {
    return client.get<{ data: ClientStats }>(`/api/v1/admin/oauth/clients/${clientId}/stats`)
  },

  // 撤销客户端所有令牌
  revokeClientTokens(clientId: string) {
    return client.post<{ message: string }>(`/api/v1/admin/oauth/clients/${clientId}/revoke-tokens`)
  }
}

// 租户级别OAuth2客户端管理API
export const tenantOAuthApi = {
  // 获取租户OAuth客户端列表
  listClients(page = 1, pageSize = 10, search = '') {
    return client.get<{ data: ClientListResponse }>('/api/v1/tenant/oauth/clients', {
      params: { page, page_size: pageSize, search }
    })
  },

  // 创建租户OAuth客户端
  createClient(data: CreateClientRequest) {
    return client.post<{ data: OAuthClient; message: string }>('/api/v1/tenant/oauth/clients', data)
  },

  // 更新租户OAuth客户端
  updateClient(clientId: string, data: UpdateClientRequest) {
    return client.put<{ data: OAuthClient; message: string }>(`/api/v1/tenant/oauth/clients/${clientId}`, data)
  },

  // 删除租户OAuth客户端
  deleteClient(clientId: string) {
    return client.delete<{ message: string }>(`/api/v1/tenant/oauth/clients/${clientId}`)
  },

  // 重新生成租户OAuth客户端密钥
  regenerateSecret(clientId: string) {
    return client.post<{ data: { client_secret: string }; message: string }>(`/api/v1/tenant/oauth/clients/${clientId}/regenerate-secret`)
  }
} 