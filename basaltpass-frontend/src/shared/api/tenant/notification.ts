import client from '../client'

// 租户级别通知接口
export interface TenantNotification {
  id: number
  user_id: number
  app_id: number
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  sender_id?: number
  sender_name?: string
  created_at: string
  updated_at: string
  app?: {
    id: number
    name: string
  }
  user?: {
    id: number
    email: string
    nickname: string
  }
}

export interface TenantCreateNotificationRequest {
  app_name: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  receiver_ids?: number[] // 为空表示广播给租户内所有用户
}

export interface TenantNotificationResponse {
  data: TenantNotification[]
  total: number
  page: number
  page_size: number
}

export interface TenantNotificationStats {
  total_sent: number
  total_read: number
  total_unread: number
  read_rate: number
  type_stats: Record<string, number>
  app_stats: Array<{
    app_name: string
    count: number
  }>
  recent_activity: Array<{
    date: string
    count: number
  }>
}

export interface TenantUser {
  id: number
  email: string
  phone?: string
  nickname: string
  role?: string
  last_login?: string
}

// 租户通知管理API
export const tenantNotificationApi = {
  // 创建通知（发送给租户下的用户）
  createNotification: (data: TenantCreateNotificationRequest) => {
    return client.post('/api/v1/tenant/notifications', data)
  },

  // 获取已发送的通知列表
  getNotifications: (page: number = 1, pageSize: number = 20, search?: string) => {
    const params: any = { page, page_size: pageSize }
    if (search) params.search = search
    return client.get<TenantNotificationResponse>('/api/v1/tenant/notifications', { params })
  },

  // 获取通知详情
  getNotification: (notificationId: number) => {
    return client.get<{ data: TenantNotification }>(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // 更新通知
  updateNotification: (notificationId: number, data: { title: string; content: string; type: string }) => {
    return client.put(`/api/v1/tenant/notifications/${notificationId}`, data)
  },

  // 删除通知
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // 获取通知统计信息
  getNotificationStats: () => {
    return client.get<{ data: TenantNotificationStats }>('/api/v1/tenant/notifications/stats')
  },

  // 获取租户下的用户列表（用于选择通知接收者）
  getTenantUsers: (search?: string) => {
    const params = search ? { search } : {}
    return client.get<{ data: TenantUser[] }>('/api/v1/tenant/notifications/users', { params })
  },

  // 搜索用户（邮箱、昵称、手机号）
  searchTenantUsers: (search: string) => {
    return client.get<{ data: TenantUser[] }>('/api/v1/tenant/notifications/users/search', {
      params: { search },
    })
  },

  // 获取租户的应用列表（用于选择发送应用）
  getTenantApps: () => {
    return client.get('/api/v1/tenant/apps')
  },

  // 批量删除通知
  batchDeleteNotifications: (notificationIds: number[]) => {
    return client.post('/api/v1/tenant/notifications/batch-delete', { ids: notificationIds })
  },

  // 撤销通知（标记为已撤销）
  revokeNotification: (notificationId: number) => {
    return client.post(`/api/v1/tenant/notifications/${notificationId}/revoke`)
  },

  // 获取通知发送记录
  getNotificationLog: (notificationId: number) => {
    return client.get(`/api/v1/tenant/notifications/${notificationId}/log`)
  }
}
