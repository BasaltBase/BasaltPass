import client from '../client'

export interface AdminTeamBrief {
  id: number
  name: string
  description: string
  avatar_url: string
  is_active: boolean
  member_count: number
  created_at: string
}

export interface AdminListTeamsResponse {
  teams: AdminTeamBrief[]
  total: number
}

export interface AdminListTeamsParams {
  page?: number
  limit?: number
  keyword?: string
}

export interface AdminCreateTeamRequest {
  name: string
  description?: string
  avatar_url?: string
  owner_user_id?: number
}

export interface AdminUpdateTeamRequest {
  name?: string
  description?: string
  avatar_url?: string
  is_active?: boolean
}

export const adminTeamApi = {
  async list(params: AdminListTeamsParams = {}) {
    const res = await client.get('/api/v1/admin/teams', { params })
    return res.data as AdminListTeamsResponse
  },
  async create(data: AdminCreateTeamRequest) {
    const res = await client.post('/api/v1/admin/teams', data)
    return res.data
  },
  async get(id: number) {
    const res = await client.get(`/api/v1/admin/teams/${id}`)
    return res.data
  },
  async update(id: number, data: AdminUpdateTeamRequest) {
    const res = await client.put(`/api/v1/admin/teams/${id}`, data)
    return res.data
  },
  async remove(id: number) {
    const res = await client.delete(`/api/v1/admin/teams/${id}`)
    return res.data
  },
  async toggleActive(id: number, active: boolean) {
    const res = await client.post(`/api/v1/admin/teams/${id}/active`, { active })
    return res.data
  },
  async listMembers(id: number) {
    const res = await client.get(`/api/v1/admin/teams/${id}/members`)
    return res.data as any[]
  },
  async addMember(id: number, data: { user_id: number; role: string }) {
    const res = await client.post(`/api/v1/admin/teams/${id}/members`, data)
    return res.data
  },
  async removeMember(id: number, userId: number) {
    const res = await client.delete(`/api/v1/admin/teams/${id}/members/${userId}`)
    return res.data
  },
  async updateMemberRole(id: number, userId: number, role: string) {
    const res = await client.put(`/api/v1/admin/teams/${id}/members/${userId}/role`, { role })
    return res.data
  },
  async transferOwnership(id: number, newOwnerId: number) {
    const res = await client.post(`/api/v1/admin/teams/${id}/transfer/${newOwnerId}`)
    return res.data
  }
}
