import client from '../client'

export interface CrossAppTrust {
  id: number
  tenant_id: number
  source_app_id: number
  target_app_id: number
  allowed_scopes: string
  max_token_ttl: number
  description: string
  is_active: boolean
  created_by: number
  created_at: string
  updated_at: string
  source_app?: { id: number; name: string; icon_url: string }
  target_app?: { id: number; name: string; icon_url: string }
}

export interface TokenExchangeLogEntry {
  id: number
  user_id: number
  source_client_id: string
  source_app_id: number
  target_app_id: number
  requested_scopes: string
  granted_scopes: string
  token_ttl: number
  status: 'granted' | 'denied'
  deny_reason?: string
  ip: string
  created_at: string
  user?: { id: number; email: string; nickname: string }
  source_app?: { id: number; name: string }
  target_app?: { id: number; name: string }
}

export interface CreateCrossAppTrustRequest {
  source_app_id: number
  target_app_id: number
  allowed_scopes: string
  max_token_ttl: number
  description?: string
}

export interface UpdateCrossAppTrustRequest {
  allowed_scopes?: string
  max_token_ttl?: number
  description?: string
  is_active?: boolean
}

export const crossAppTrustApi = {
  async list(page = 1, pageSize = 20) {
    const response = await client.get<{
      data: {
        trusts: CrossAppTrust[]
        total: number
        page: number
        page_size: number
      }
    }>('/api/v1/tenant/cross-app-trusts', { params: { page, page_size: pageSize } })
    return response.data.data
  },

  async create(data: CreateCrossAppTrustRequest) {
    const response = await client.post<{ data: CrossAppTrust }>('/api/v1/tenant/cross-app-trusts', data)
    return response.data.data
  },

  async update(id: number, data: UpdateCrossAppTrustRequest) {
    const response = await client.patch<{ data: CrossAppTrust }>(`/api/v1/tenant/cross-app-trusts/${id}`, data)
    return response.data.data
  },

  async delete(id: number) {
    const response = await client.delete<{ message: string }>(`/api/v1/tenant/cross-app-trusts/${id}`)
    return response.data
  },

  async listLogs(params: { page?: number; page_size?: number; status?: string; source_app_id?: number; target_app_id?: number } = {}) {
    const response = await client.get<{
      data: {
        logs: TokenExchangeLogEntry[]
        total: number
        page: number
        page_size: number
      }
    }>('/api/v1/tenant/cross-app-trusts/logs', { params })
    return response.data.data
  },
}
