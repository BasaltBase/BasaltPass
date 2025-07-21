import client from './client'

export interface Notification {
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
  data: Notification[]
  total: number
  page: number
  page_size: number
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
    return client.post('/api/v1/admin/notifications', data)
  },

  // 管理员：获取所有通知
  getAllNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/admin/notifications?page=${page}&page_size=${pageSize}`)
  },

  // 管理员：删除通知
  deleteNotificationAdmin: (notificationId: number) => {
    return client.delete(`/api/v1/admin/notifications/${notificationId}`)
  }
} 