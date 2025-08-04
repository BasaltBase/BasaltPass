// 角色和权限管理 API
import client from './client'

export interface Role {
  id: number
  code: string
  name: string
  description: string
  app_id?: number
  app_name?: string
  is_system: boolean
  user_count: number
  permissions?: Permission[]
  created_at: string
  updated_at: string
}

export interface Permission {
  id: number
  code: string
  desc: string
}

export interface CreateRoleRequest {
  code: string
  name: string
  description: string
  app_id?: number
}

export interface UserRoleRequest {
  user_id: number
  role_ids: number[]
}

export interface UserRole {
  user_id: number
  email: string
  nickname: string
  roles: Role[]
}

export interface TenantUser {
  id: number
  email: string
  nickname: string
  role: string // tenant role: owner, admin, member
}

// 获取租户角色列表
export const getTenantRoles = (params?: {
  page?: number
  page_size?: number
  app_id?: string
  search?: string
}) => {
  return client.get('/api/v1/tenant/roles', { params })
}

// 创建租户角色
export const createTenantRole = (data: CreateRoleRequest) => {
  return client.post('/api/v1/admin/roles', data)
}

// 更新租户角色
export const updateTenantRole = (id: number, data: CreateRoleRequest) => {
  return client.put(`/api/v1/admin/roles/${id}`, data)
}

// 删除租户角色
export const deleteTenantRole = (id: number) => {
  return client.delete(`/api/v1/admin/roles/${id}`)
}

// 获取租户用户列表（用于角色分配）
export const getTenantUsersForRole = (params?: {
  page?: number
  page_size?: number
  search?: string
}) => {
  return client.get('/api/v1/admin/roles/users', { params })
}

// 分配用户角色
export const assignUserRoles = (data: UserRoleRequest) => {
  return client.post('/api/v1/admin/roles/assign', data)
}

// 获取用户角色
export const getUserRoles = (userId: number) => {
  return client.get(`/api/v1/admin/roles/users/${userId}`)
}
