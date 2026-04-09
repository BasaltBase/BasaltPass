import client from '../client';

export interface CreateTeamRequest {
  name: string;
  description?: string;
  avatar_url?: string;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  avatar_url?: string;
}

export interface TeamResponse {
  id: number;
  name: string;
  description: string;
  avatar_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  member_count: number;
  user_role?: string;
}

export interface TeamMemberResponse {
  id: number;
  team_id: number;
  user_id: number;
  role: string;
  status: string;
  joined_at: string;
  created_at: string;
  user: {
    id: number;
    email: string;
    nickname: string;
    avatar_url: string;
  };
}

export interface AddMemberRequest {
  user_id: number;
  role: 'owner' | 'admin' | 'member';
}

export interface UpdateMemberRoleRequest {
  role: 'owner' | 'admin' | 'member';
}

export interface UserTeamResponse {
  team_id: number;
  team_name: string;
  role: string;
  joined_at: string;
}

// teamAPI
export const teamApi = {
  // createteam
  createTeam: (data: CreateTeamRequest) =>
    client.post<{ data: { team: TeamResponse }; message: string }>('/api/v1/teams', data),

  // getusertranslatedhasteam
  getUserTeams: () =>
    client.get<{ data: UserTeamResponse[] }>('/api/v1/teams'),

  // getteaminfo
  getTeam: (id: number) =>
    client.get<{ data: TeamResponse }>(`/api/v1/teams/${id}`),

  // updateteaminfo
  updateTeam: (id: number, data: UpdateTeamRequest) =>
    client.put<{ message: string }>(`/api/v1/teams/${id}`, data),

  // deleteteam
  deleteTeam: (id: number) =>
    client.delete<{ message: string }>(`/api/v1/teams/${id}`),

  // getteamtranslatedlist
  getTeamMembers: (id: number) =>
    client.get<{ data: TeamMemberResponse[] }>(`/api/v1/teams/${id}/members`),

  // translatedteamtranslated
  addMember: (id: number, data: AddMemberRequest) =>
    client.post<{ message: string }>(`/api/v1/teams/${id}/members`, data),

  // updatetranslatedrole
  updateMemberRole: (teamId: number, memberId: number, data: UpdateMemberRoleRequest) =>
    client.put<{ message: string }>(`/api/v1/teams/${teamId}/members/${memberId}`, data),

  // translatedteamtranslated
  removeMember: (teamId: number, memberId: number) =>
    client.delete<{ message: string }>(`/api/v1/teams/${teamId}/members/${memberId}`),

  // translatedteam
  leaveTeam: (id: number) =>
    client.post<{ message: string }>(`/api/v1/teams/${id}/leave`),
}; 