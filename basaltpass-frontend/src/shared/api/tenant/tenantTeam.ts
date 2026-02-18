import client from '../client'

export interface TenantTeamBrief {
  id: number
  name: string
  description: string
  avatar_url: string
  is_active: boolean
  member_count: number
  created_at: string
}

export interface TenantListTeamsResponse {
  teams: TenantTeamBrief[]
  total: number
}

export interface TenantListTeamsParams {
  page?: number
  limit?: number
  keyword?: string
}

export interface TenantCreateTeamRequest {
  name: string
  description?: string
  avatar_url?: string
  owner_user_id?: number
}

export interface TenantUpdateTeamRequest {
  name?: string
  description?: string
  avatar_url?: string
  is_active?: boolean
}

export const tenantTeamApi = {
  async list(params: TenantListTeamsParams = {}) {
    const res = await client.get('/api/v1/tenant/teams', { params })
    return res.data as TenantListTeamsResponse
  },
  async create(data: TenantCreateTeamRequest) {
    const res = await client.post('/api/v1/tenant/teams', data)
    return res.data
  },
  async get(id: number) {
    const res = await client.get(`/api/v1/tenant/teams/${id}`)
    return res.data
  },
  async update(id: number, data: TenantUpdateTeamRequest) {
    const res = await client.put(`/api/v1/tenant/teams/${id}`, data)
    return res.data
  },
  async remove(id: number) {
    const res = await client.delete(`/api/v1/tenant/teams/${id}`)
    return res.data
  },
  async toggleActive(id: number, active: boolean) {
    const res = await client.post(`/api/v1/tenant/teams/${id}/active`, { active })
    return res.data
  },
  async listMembers(id: number) {
    const res = await client.get(`/api/v1/tenant/teams/${id}/members`)
    return res.data as any[]
  },
  async addMember(id: number, data: { user_id: number; role: string }) {
    const res = await client.post(`/api/v1/tenant/teams/${id}/members`, data)
    return res.data
  },
  async removeMember(id: number, userId: number) {
    const res = await client.delete(`/api/v1/tenant/teams/${id}/members/${userId}`)
    return res.data
  },
  async updateMemberRole(id: number, userId: number, role: string) {
    const res = await client.put(`/api/v1/tenant/teams/${id}/members/${userId}/role`, { role })
    return res.data
  },
  async transferOwnership(id: number, newOwnerId: number) {
    const res = await client.post(`/api/v1/tenant/teams/${id}/transfer/${newOwnerId}`)
    return res.data
  }
}
