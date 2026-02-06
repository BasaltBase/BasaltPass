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

// 团队API
export const teamApi = {
  // 创建团队
  createTeam: (data: CreateTeamRequest) =>
    client.post<{ data: { team: TeamResponse }; message: string }>('/api/v1/teams', data),

  // 获取用户的所有团队
  getUserTeams: () =>
    client.get<{ data: UserTeamResponse[] }>('/api/v1/teams'),

  // 获取团队信息
  getTeam: (id: number) =>
    client.get<{ data: TeamResponse }>(`/api/v1/teams/${id}`),

  // 更新团队信息
  updateTeam: (id: number, data: UpdateTeamRequest) =>
    client.put<{ message: string }>(`/api/v1/teams/${id}`, data),

  // 删除团队
  deleteTeam: (id: number) =>
    client.delete<{ message: string }>(`/api/v1/teams/${id}`),

  // 获取团队成员列表
  getTeamMembers: (id: number) =>
    client.get<{ data: TeamMemberResponse[] }>(`/api/v1/teams/${id}/members`),

  // 添加团队成员
  addMember: (id: number, data: AddMemberRequest) =>
    client.post<{ message: string }>(`/api/v1/teams/${id}/members`, data),

  // 更新成员角色
  updateMemberRole: (teamId: number, memberId: number, data: UpdateMemberRoleRequest) =>
    client.put<{ message: string }>(`/api/v1/teams/${teamId}/members/${memberId}`, data),

  // 移除团队成员
  removeMember: (teamId: number, memberId: number) =>
    client.delete<{ message: string }>(`/api/v1/teams/${teamId}/members/${memberId}`),

  // 离开团队
  leaveTeam: (id: number) =>
    client.post<{ message: string }>(`/api/v1/teams/${id}/leave`),
}; 