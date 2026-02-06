// 租户权限管理 API
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

// 获取租户权限列表
export const getTenantPermissions = (params?: {
  page?: number
  page_size?: number
  search?: string
  category?: string
}) => {
  return client.get('/api/v1/tenant/permissions', { params })
}

// 创建租户权限
export const createTenantPermission = (data: CreateTenantPermissionRequest) => {
  return client.post('/api/v1/tenant/permissions', data)
}

// 更新租户权限
export const updateTenantPermission = (id: number, data: CreateTenantPermissionRequest) => {
  return client.put(`/api/v1/tenant/permissions/${id}`, data)
}

// 删除租户权限
export const deleteTenantPermission = (id: number) => {
  return client.delete(`/api/v1/tenant/permissions/${id}`)
}

// 获取权限分类列表
export const getTenantPermissionCategories = () => {
  return client.get('/api/v1/tenant/permissions/categories')
}

// 获取角色的权限列表
export const getRolePermissions = (roleId: number) => {
  return client.get(`/api/v1/tenant/roles/${roleId}/permissions`)
}

// 为角色添加权限
export const addPermissionsToRole = (roleId: number, permissionIds: number[]) => {
  return client.post(`/api/v1/tenant/roles/${roleId}/permissions`, {
    permission_ids: permissionIds
  })
}

// 从角色移除权限
export const removePermissionFromRole = (roleId: number, permissionId: number) => {
  return client.delete(`/api/v1/tenant/roles/${roleId}/permissions/${permissionId}`)
}
