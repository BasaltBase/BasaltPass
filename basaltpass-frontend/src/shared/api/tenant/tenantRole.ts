// roleandpermissionmanagement API
import client from '../client'

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

// gettenantrolelist
export const getTenantRoles = (params?: {
  page?: number
  page_size?: number
  app_id?: string
  search?: string
}) => {
  return client.get('/api/v1/tenant/roles', { params })
}

// createtenantrole
export const createTenantRole = (data: CreateRoleRequest) => {
  return client.post('/api/v1/tenant/roles', data)
}

// updatetenantrole
export const updateTenantRole = (id: number, data: CreateRoleRequest) => {
  return client.put(`/api/v1/tenant/roles/${id}`, data)
}

// deletetenantrole
export const deleteTenantRole = (id: number) => {
  return client.delete(`/api/v1/tenant/roles/${id}`)
}

// gettenantuserlist（translatedroletranslated）
export const getTenantUsersForRole = (params?: {
  page?: number
  page_size?: number
  search?: string
}) => {
  return client.get('/api/v1/tenant/roles/users', { params })
}

// translateduserrole
export const assignUserRoles = (data: UserRoleRequest) => {
  return client.post('/api/v1/tenant/roles/assign', data)
}

// getuserrole
export const getUserRoles = (userId: number) => {
  return client.get(`/api/v1/tenant/roles/users/${userId}`)
}
