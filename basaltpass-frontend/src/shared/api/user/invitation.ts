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
  // translatedinvitation
  create: (teamId: number, inviteeIds: number[], remark = '') =>
    client.post(`/api/v1/teams/${teamId}/invitations`, { invitee_ids: inviteeIds, remark }),

  // translatedinvitation
  revoke: (teamId: number, invId: number) =>
    client.delete(`/api/v1/teams/${teamId}/invitations/${invId}`),

  // translatedinvitation
  accept: (invId: number) => client.put(`/api/v1/invitations/${invId}/accept`),

  // translatedinvitation
  reject: (invId: number) => client.put(`/api/v1/invitations/${invId}/reject`),

  // translatedtoinvitation
  listIncoming: () => client.get<Invitation[]>('/api/v1/invitations'),

  // teamalreadytranslatedinvitation
  listOutgoing: (teamId: number) => client.get<Invitation[]>(`/api/v1/teams/${teamId}/invitations`),
} 