// tenantpermissionmanagement API
import client from '../client'

export interface TenantPermission {
  id: number
  code: string
  name: string
  description: string
  category: string
  created_at: string
  updated_at: string
}

export interface CreateTenantPermissionRequest {
  code: string
  name: string
  description: string
  category: string
}

// gettenantpermissionlist
export const getTenantPermissions = (params?: {
  page?: number
  page_size?: number
  search?: string
  category?: string
}) => {
  return client.get('/api/v1/tenant/permissions', { params })
}

// createtenantpermission
export const createTenantPermission = (data: CreateTenantPermissionRequest) => {
  return client.post('/api/v1/tenant/permissions', data)
}

// updatetenantpermission
export const updateTenantPermission = (id: number, data: CreateTenantPermissionRequest) => {
  return client.put(`/api/v1/tenant/permissions/${id}`, data)
}

// deletetenantpermission
export const deleteTenantPermission = (id: number) => {
  return client.delete(`/api/v1/tenant/permissions/${id}`)
}

// getpermissiontranslatedlist
export const getTenantPermissionCategories = () => {
  return client.get('/api/v1/tenant/permissions/categories')
}

// getroletranslatedpermissionlist
export const getRolePermissions = (roleId: number) => {
  return client.get(`/api/v1/tenant/roles/${roleId}/permissions`)
}

// translatedroletranslatedpermission
export const addPermissionsToRole = (roleId: number, permissionIds: number[]) => {
  return client.post(`/api/v1/tenant/roles/${roleId}/permissions`, {
    permission_ids: permissionIds
  })
}

// translatedroletranslatedpermission
export const removePermissionFromRole = (roleId: number, permissionId: number) => {
  return client.delete(`/api/v1/tenant/roles/${roleId}/permissions/${permissionId}`)
}
