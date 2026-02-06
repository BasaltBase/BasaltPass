import client from '../client'

export interface UserApp {
  id: number
  app_id: number
  app_name: string
  app_description: string
  app_icon_url: string
  first_authorized_at: string
  last_authorized_at: string
  last_active_at?: string
  scopes: string
}

export interface UserAppsResponse {
  apps: UserApp[]
}

export const userAppsApi = {
  // 获取当前用户已授权的应用
  async list() {
    const res = await client.get<UserAppsResponse>('/api/v1/user/apps')
    return res.data
  },

  // 撤销对某个应用的授权
  async revoke(appId: number) {
    const res = await client.delete(`/api/v1/user/apps/${appId}`)
    return res.data
  },
}

export default userAppsApi
