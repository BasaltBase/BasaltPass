import client from '../client'

export interface TenantNotification {
  id: number
  user_id: number
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
  updated_at: string
}

export interface CreateNotificationRequest {
  app_name: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  receiver_ids?: number[] // 为空或缺省表示广播
}

export interface NotificationResponse {
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
  recent_activity: Array<{
    date: string
    count: number
  }>
}

export const notificationApi = {
  // 获取用户的通知列表
  getUserNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/notifications?page=${page}&page_size=${pageSize}`)
  },

  // 获取未读通知数量
  getUnreadCount: () => {
    return client.get<{ count: number }>('/api/v1/notifications/unread-count')
  },

  // 标记通知为已读
  markAsRead: (notificationId: number) => {
    return client.put(`/api/v1/notifications/${notificationId}/read`)
  },

  // 标记所有通知为已读
  markAllAsRead: () => {
    return client.put('/api/v1/notifications/mark-all-read')
  },

  // 删除通知
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/notifications/${notificationId}`)
  },

  // 管理员：创建通知
  createNotification: (data: CreateNotificationRequest) => {
    return client.post('/api/v1/tenant/notifications', data)
  },

  // 管理员：获取所有通知
  getAllNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/tenant/notifications?page=${page}&page_size=${pageSize}`)
  },

  // 管理员：删除通知
  deleteNotificationAdmin: (notificationId: number) => {
    return client.delete(`/api/v1/tenant/notifications/${notificationId}`)
  }
}

// 租户通知管理API
export const tenantNotificationApi = {
  // 租户：创建通知（发送给租户下的用户）
  createNotification: (data: CreateNotificationRequest) => {
    return client.post('/api/v1/tenant/notifications', data)
  },

  // 租户：获取已发送的通知列表
  getNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/tenant/notifications?page=${page}&page_size=${pageSize}`)
  },

  // 租户：获取通知详情
  getNotification: (notificationId: number) => {
    return client.get(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // 租户：更新通知
  updateNotification: (notificationId: number, data: { title: string; content: string; type: string }) => {
    return client.put(`/api/v1/tenant/notifications/${notificationId}`, data)
  },

  // 租户：删除通知
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // 租户：获取租户下的用户列表（用于选择通知接收者）
  getTenantUsers: (search?: string) => {
    const params = search ? { search } : {}
    return client.get('/api/v1/tenant/notifications/users', { params })
  },

  // 租户：搜索用户（根据邮箱、昵称等）
  searchTenantUsers: (search: string) => {
    return client.get('/api/v1/tenant/notifications/users/search', { 
      params: { search } 
    })
  },

  // 租户：获取通知统计信息
  getNotificationStats: () => {
    return client.get<{ data: TenantNotificationStats }>('/api/v1/tenant/notifications/stats')
  }
} 