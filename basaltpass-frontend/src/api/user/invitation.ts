import client from '../client'

export interface Invitation {
  id: number
  team_id: number
  inviter_id: number
  invitee_id: number
  status: 'pending' | 'accepted' | 'rejected' | 'revoked'
  remark?: string
  created_at: string
  team?: { id: number; name: string }
  inviter?: { id: number; nickname: string; email: string }
  invitee?: { id: number; nickname: string; email: string }
}

export const invitationApi = {
  // 发起邀请
  create: (teamId: number, inviteeIds: number[], remark = '') =>
    client.post(`/api/v1/teams/${teamId}/invitations`, { invitee_ids: inviteeIds, remark }),

  // 撤回邀请
  revoke: (teamId: number, invId: number) =>
    client.delete(`/api/v1/teams/${teamId}/invitations/${invId}`),

  // 接受邀请
  accept: (invId: number) => client.put(`/api/v1/invitations/${invId}/accept`),

  // 拒绝邀请
  reject: (invId: number) => client.put(`/api/v1/invitations/${invId}/reject`),

  // 我的收到邀请
  listIncoming: () => client.get<Invitation[]>('/api/v1/invitations'),

  // 团队已发邀请
  listOutgoing: (teamId: number) => client.get<Invitation[]>(`/api/v1/teams/${teamId}/invitations`),
} 