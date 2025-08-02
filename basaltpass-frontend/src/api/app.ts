import client from './client'

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

// 租户级别应用管理API
export const tenantAppApi = {
  // 租户应用CRUD
  async listApps(page = 1, limit = 20, search?: string) {
    const params: any = { page, limit }
    if (search) {
      params.search = search
    }
    const response = await client.get('/api/v1/tenant/apps', { params })
    return response.data
  },

  async getApp(id: string) {
    const response = await client.get(`/api/v1/tenant/apps/${id}`)
    return response.data
  },

  // 租户应用统计
  async getAppStats(appId: string, period = '7d') {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/stats`, {
      params: { period }
    })
    return response.data
  },

  // 应用权限管理
  async listAppPermissions(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/permissions`)
    return response.data
  },

  async createAppPermission(appId: string, data: any) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/permissions`, data)
    return response.data
  },

  async updateAppPermission(appId: string, permissionId: string, data: any) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`, data)
    return response.data
  },

  async deleteAppPermission(appId: string, permissionId: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`)
    return response.data
  },

  // 应用角色管理
  async listAppRoles(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/roles`)
    return response.data
  },

  async createAppRole(appId: string, data: any) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/roles`, data)
    return response.data
  },

  async updateAppRole(appId: string, roleId: string, data: any) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/roles/${roleId}`, data)
    return response.data
  },

  async deleteAppRole(appId: string, roleId: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/roles/${roleId}`)
    return response.data
  },

  // 应用用户管理
  async listAppUsers(appId: string, page = 1, limit = 20) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users`, {
      params: { page, limit }
    })
    return response.data
  },

  async getAppUsersByStatus(appId: string, status: string, page = 1, limit = 20) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/by-status`, {
      params: { status, page, limit }
    })
    return response.data
  },

  async getAppUserStats(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/stats`)
    return response.data
  },

  async updateAppUserStatus(appId: string, userId: string, status: string) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/users/${userId}/status`, { status })
    return response.data
  },

  // 应用用户权限管理
  async getUserPermissions(appId: string, userId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`)
    return response.data
  },

  async grantUserPermissions(appId: string, userId: string, permissionIds: string[]) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`, {
      permission_ids: permissionIds
    })
    return response.data
  },

  async revokeUserPermission(appId: string, userId: string, permissionId: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions/${permissionId}`)
    return response.data
  },

  async assignUserRoles(appId: string, userId: string, roleIds: string[]) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/roles`, {
      role_ids: roleIds
    })
    return response.data
  },

  async revokeUserRole(appId: string, userId: string, roleId: string) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/roles/${roleId}`)
    return response.data
  }
}
