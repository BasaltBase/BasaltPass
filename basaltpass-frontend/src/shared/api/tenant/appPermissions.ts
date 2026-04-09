import client from '../client'

// userpermissionmanagementtranslatedAPItranslated

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

function normalizeUserPermission(item: any, appId: string, userId: string): UserPermission {
  if (item?.permission) {
    return {
      ...item,
      permission_id: item.permission_id ?? item.permission?.id ?? 0
    }
  }

  return {
    id: item?.id ?? 0,
    user_id: Number(userId) || 0,
    app_id: Number(appId) || 0,
    permission_id: item?.permission_id ?? item?.id ?? 0,
    granted_at: item?.granted_at || item?.created_at || '',
    granted_by: item?.granted_by ?? 0,
    expires_at: item?.expires_at,
    permission: item
  }
}

function normalizeUserRole(item: any, appId: string, userId: string): UserRole {
  if (item?.role) {
    return {
      ...item,
      role_id: item.role_id ?? item.role?.id ?? 0
    }
  }

  return {
    id: item?.id ?? 0,
    user_id: Number(userId) || 0,
    app_id: Number(appId) || 0,
    role_id: item?.role_id ?? item?.id ?? 0,
    assigned_at: item?.assigned_at || item?.created_at || '',
    assigned_by: item?.assigned_by ?? 0,
    expires_at: item?.expires_at,
    role: item
  }
}

// userpermissionmanagementAPI
export const userPermissionsApi = {
  // ==================== permissionmanagement ====================
  
  // getapptranslatedhaspermission
  async getAppPermissions(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/permissions`)
    return response.data
  },

  // getusertranslatedapptranslatedpermission
  async getUserPermissions(appId: string, userId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`)
    return {
      ...response.data,
      permissions: (response.data?.permissions || []).map((item: any) => normalizeUserPermission(item, appId, userId))
    }
  },

  // translateduserpermission
  async grantUserPermissions(appId: string, userId: string, data: GrantPermissionRequest) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions`, data)
    return response.data
  },

  // translateduserpermission
  async revokeUserPermission(appId: string, userId: string, permissionId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/permissions/${permissionId}`)
    return response.data
  },

  // ==================== rolemanagement ====================
  
  // getapptranslatedhasrole
  async getAppRoles(appId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/roles`)
    return response.data
  },

  // createrole
  async createRole(appId: string, data: CreateRoleRequest) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/roles`, data)
    return response.data
  },

  // updaterole
  async updateRole(appId: string, roleId: number, data: UpdateRoleRequest) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/roles/${roleId}`, data)
    return response.data
  },

  // deleterole
  async deleteRole(appId: string, roleId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/roles/${roleId}`)
    return response.data
  },

  // getusertranslatedapptranslatedrole
  async getUserRoles(appId: string, userId: string) {
    const response = await client.get(`/api/v1/tenant/apps/${appId}/users/${userId}/roles`)
    return {
      ...response.data,
      roles: (response.data?.roles || []).map((item: any) => normalizeUserRole(item, appId, userId))
    }
  },

  // translatedroletranslateduser
  async assignUserRoles(appId: string, userId: string, data: AssignRoleRequest) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/users/${userId}/roles`, data)
    return response.data
  },

  // translateduserrole
  async revokeUserRole(appId: string, userId: string, roleId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/users/${userId}/roles/${roleId}`)
    return response.data
  },

  // ==================== permissionmanagement ====================
  
  // createpermission
  async createPermission(appId: string, data: {
    code: string,
    name: string,
    description?: string,
    category: string
  }) {
    const response = await client.post(`/api/v1/tenant/apps/${appId}/permissions`, data)
    return response.data
  },

  // updatepermission
  async updatePermission(appId: string, permissionId: number, data: {
    name: string,
    description?: string,
    category: string
  }) {
    const response = await client.put(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`, data)
    return response.data
  },

  // deletepermission
  async deletePermission(appId: string, permissionId: number) {
    const response = await client.delete(`/api/v1/tenant/apps/${appId}/permissions/${permissionId}`)
    return response.data
  }
}

export default userPermissionsApi
