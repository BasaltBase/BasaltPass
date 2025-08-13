import client from '../client'

export interface AdminInvitationBrief {
  id: number
  team_id: number
  team_name: string
  inviter_id: number
  invitee_id: number
  status: string
  remark: string
  created_at: string
  updated_at: string
}

export interface AdminListInvitationsResponse {
  invitations: AdminInvitationBrief[]
  total: number
}

export interface AdminListInvitationsParams {
  page?: number
  limit?: number
  status?: string
  team_id?: number
  inviter_id?: number
  invitee_id?: number
  keyword?: string
}

export const adminInvitationApi = {
  async list(params: AdminListInvitationsParams = {}) {
    const res = await client.get('/api/v1/admin/invitations', { params })
    return res.data as AdminListInvitationsResponse
  },
  async create(data: { team_id: number; inviter_id?: number; invitee_ids: number[]; remark?: string }) {
    const res = await client.post('/api/v1/admin/invitations', data)
    return res.data
  },
  async updateStatus(id: number, status: string) {
    const res = await client.put(`/api/v1/admin/invitations/${id}/status`, { status })
    return res.data
  },
  async remove(id: number) {
    const res = await client.delete(`/api/v1/admin/invitations/${id}`)
    return res.data
  }
}
