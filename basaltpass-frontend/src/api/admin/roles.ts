import client from "@api/client"

export interface AdminRole {
  ID: number
  tenant_id?: number
  code: string
  name: string
  description?: string
  is_system?: boolean
}

export const listRoles = () => client.get<AdminRole[]>("/api/v1/admin/roles")
