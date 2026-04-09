import client from '../client'

// OAuth2translatedtypetranslated
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

export interface OAuthScopeMeta {
  scope: string
  title: string
  description: string
  category: string
}

export interface ListOAuthScopesData {
  scopes: OAuthScopeMeta[]
  defaults: string[]
}

// OAuth2translatedmanagementAPI
export const oauthApi = {
  // gettranslatedlist
  listClients(page = 1, pageSize = 10, search = '') {
    return client.get<{ data: ClientListResponse }>('/api/v1/admin/oauth/clients', {
      params: { page, page_size: pageSize, search }
    })
  },

  // createtranslated
  createClient(data: CreateClientRequest) {
    return client.post<{ data: OAuthClient; message: string }>('/api/v1/admin/oauth/clients', data)
  },

  // gettranslateddetails
  getClient(clientId: string) {
    return client.get<{ data: OAuthClient }>(`/api/v1/admin/oauth/clients/${clientId}`)
  },

  // updatetranslated
  updateClient(clientId: string, data: UpdateClientRequest) {
    return client.put<{ data: OAuthClient; message: string }>(`/api/v1/admin/oauth/clients/${clientId}`, data)
  },

  // deletetranslated
  deleteClient(clientId: string) {
    return client.delete<{ message: string }>(`/api/v1/admin/oauth/clients/${clientId}`)
  },

  // translated
  regenerateSecret(clientId: string) {
    return client.post<{ data: { client_secret: string }; message: string }>(`/api/v1/admin/oauth/clients/${clientId}/regenerate-secret`)
  },

  // gettranslatedinfo
  getClientStats(clientId: string) {
    return client.get<{ data: ClientStats }>(`/api/v1/admin/oauth/clients/${clientId}/stats`)
  },

  // translatedhastranslated
  revokeClientTokens(clientId: string) {
    return client.post<{ message: string }>(`/api/v1/admin/oauth/clients/${clientId}/revoke-tokens`)
  },

  // getcantranslated scopes（translated）
  listScopes() {
    return client.get<{ data: ListOAuthScopesData }>('/api/v1/admin/oauth/scopes')
  }
}

// tenanttranslatedOAuth2translatedmanagementAPI
export const tenantOAuthApi = {
  // gettenantOAuthtranslatedlist
  listClients(page = 1, pageSize = 10, search = '') {
    return client.get<{ data: ClientListResponse }>('/api/v1/tenant/oauth/clients', {
      params: { page, page_size: pageSize, search }
    })
  },

  // createtenantOAuthtranslated
  createClient(data: CreateClientRequest) {
    return client.post<{ data: OAuthClient; message: string }>('/api/v1/tenant/oauth/clients', data)
  },

  // updatetenantOAuthtranslated
  updateClient(clientId: string, data: UpdateClientRequest) {
    return client.put<{ data: OAuthClient; message: string }>(`/api/v1/tenant/oauth/clients/${clientId}`, data)
  },

  // deletetenantOAuthtranslated
  deleteClient(clientId: string) {
    return client.delete<{ message: string }>(`/api/v1/tenant/oauth/clients/${clientId}`)
  },

  // translatedtenantOAuthtranslated
  regenerateSecret(clientId: string) {
    return client.post<{ data: { client_secret: string }; message: string }>(`/api/v1/tenant/oauth/clients/${clientId}/regenerate-secret`)
  }
} 