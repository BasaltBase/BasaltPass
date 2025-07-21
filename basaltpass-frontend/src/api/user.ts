import client from './client'

export interface UserSearchResult {
  id: number
  nickname: string
  email: string
  avatar?: string
}

export const userApi = {
  // 搜索用户
  search: (query: string, limit = 10) =>
    client.get<UserSearchResult[]>(`/api/v1/users/search?q=${encodeURIComponent(query)}&limit=${limit}`),
} 