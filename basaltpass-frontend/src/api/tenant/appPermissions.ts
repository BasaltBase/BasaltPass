import client from '../client'

// 用户权限管理相关的API接口

export interface Permission {
  id: number
  code: string
  name: string
  description: string
  category: string
  created_at: string
  updated_at: string
}

export interface UserPermission {
  id: number
  user_id: number
  app_id: number
  permission_id: number
  granted_at: string
  granted_by: number
  expires_at?: string
  permission: Permission
}

export interface Role {
  id: number
  code: string
  name: string
  description: string
  app_id: number
  permissions: Permission[]
  created_at: string
  updated_at: string
}

export interface UserRole {
  id: number
  user_id: number
  app_id: number
  role_id: number
  assigned_at: string
  assigned_by: number
  expires_at?: string
  role: Role
}

export interface GrantPermissionRequest {
  permission_ids: number[]
  expires_at?: string
}

export interface AssignRoleRequest {
  role_ids: number[]
  expires_at?: string
}

export interface CreateRoleRequest {
  code: string
  name: string
  description?: string
  permission_ids: number[]
}

export interface UpdateRoleRequest {
  name?: string
  description?: string
  permission_ids?: number[]
}

// 用户权限管理API
export const userPermissionsApi = {
  // ==================== 权限管理 ====================
  
  // 获取应用所有权限
  async getAppPermissions(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/permissions`)
    return response.data
  },

  // 获取用户在应用中的权限
  async getUserPermissions(appId: string, userId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`)
    return response.data
  },

  // 授予用户权限
  async grantUserPermissions(appId: string, userId: string, data: GrantPermissionRequest) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`, data)
    return response.data
  },

  // 撤销用户权限
  async revokeUserPermission(appId: string, userId: string, permissionId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions/${permissionId}`)
    return response.data
  },

  // ==================== 角色管理 ====================
  
  // 获取应用所有角色
  async getAppRoles(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/roles`)
    return response.data
  },

  // 创建角色
  async createRole(appId: string, data: CreateRoleRequest) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/roles`, data)
    return response.data
  },

  // 更新角色
  async updateRole(appId: string, roleId: number, data: UpdateRoleRequest) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/roles/${roleId}`, data)
    return response.data
  },

  // 删除角色
  async deleteRole(appId: string, roleId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/roles/${roleId}`)
    return response.data
  },

  // 获取用户在应用中的角色
  async getUserRoles(appId: string, userId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/${userId}/roles`)
    return response.data
  },

  // 分配角色给用户
  async assignUserRoles(appId: string, userId: string, data: AssignRoleRequest) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/roles`, data)
    return response.data
  },

  // 撤销用户角色
  async revokeUserRole(appId: string, userId: string, roleId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/roles/${roleId}`)
    return response.data
  },

  // ==================== 权限管理 ====================
  
  // 创建权限
  async createPermission(appId: string, data: {
    code: string,
    name: string,
    description?: string,
    category: string
  }) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/permissions`, data)
    return response.data
  },

  // 更新权限
  async updatePermission(appId: string, permissionId: number, data: {
    name: string,
    description?: string,
    category: string
  }) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`, data)
    return response.data
  },

  // 删除权限
  async deletePermission(appId: string, permissionId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`)
    return response.data
  }
}

export default userPermissionsApi
