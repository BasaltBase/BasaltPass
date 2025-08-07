import client from "@api/client"

export interface Permission {
  ID: number
  Code: string
  Desc: string
  created_at?: string
  updated_at?: string
}

export interface PermissionPayload {
  code: string
  desc?: string
}

export const listPermissions = () => client.get<Permission[]>("/api/v1/admin/permissions/")
export const createPermission = (data: PermissionPayload) => client.post<Permission>("/api/v1/admin/permissions/", data)
export const updatePermission = (id: number, data: PermissionPayload) => client.put<Permission>(`/api/v1/admin/permissions/${id}` , data)
export const deletePermission = (id: number) => client.delete(`/api/v1/admin/permissions/${id}`)

export const getRolePermissions = (roleId: number) => client.get<Permission[]>(`/api/v1/admin/roles/${roleId}/permissions`)
export const setRolePermissions = (roleId: number, permission_ids: number[]) => client.post(`/api/v1/admin/roles/${roleId}/permissions`, { permission_ids })
export const removeRolePermission = (roleId: number, permissionId: number) => client.delete(`/api/v1/admin/roles/${roleId}/permissions/${permissionId}`)
