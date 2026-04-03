import client from '../client'

export interface TenantManualApiKey {
  id: number
  name: string
  scope: 'tenant'
  tenant_id?: number
  key_prefix: string
  is_active: boolean
  created_by_user_id: number
  last_used_at?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

export interface CreateTenantManualApiKeyRequest {
  name: string
  expires_at?: string
}

export interface CreateTenantManualApiKeyResponse {
  data: {
    id: number
    name: string
    scope: 'tenant'
    tenant_id?: number
    key: string
    key_prefix: string
    expires_at?: string
    created_at: string
  }
  message?: string
}

export const tenantManualApi = {
  async listKeys() {
    const response = await client.get<{ data: TenantManualApiKey[] }>('/api/v1/tenant/manual-api/keys')
    return response.data
  },

  async createKey(data: CreateTenantManualApiKeyRequest) {
    const response = await client.post<CreateTenantManualApiKeyResponse>('/api/v1/tenant/manual-api/keys', data)
    return response.data
  },

  async deleteKey(id: number) {
    const response = await client.delete<{ message: string }>(`/api/v1/tenant/manual-api/keys/${id}`)
    return response.data
  },
}
