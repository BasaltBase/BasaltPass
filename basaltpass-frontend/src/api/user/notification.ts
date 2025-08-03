import client from '../client'

// 用户级别通知接口
export interface UserNotification {
  id: number
  user_id: number
  app_id: number
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  is_important: boolean
  sender_name?: string
  created_at: string
  updated_at: string
  read_at?: string
  app?: {
    id: number
    name: string
    icon_url?: string
  }
}

export interface UserNotificationResponse {
  data: UserNotification[]
  total: number
  page: number
  page_size: number
  unread_count: number
}

export interface UserNotificationSettings {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  quiet_hours_enabled: boolean
  quiet_hours_start: string // "22:00"
  quiet_hours_end: string   // "08:00"
  notification_types: {
    info: boolean
    success: boolean
    warning: boolean
    error: boolean
  }
}

export interface UserNotificationPreferences {
  app_id: number
  app_name: string
  enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
}

// 用户通知API
export const userNotificationApi = {
  // 获取用户的通知列表
  getNotifications: (page: number = 1, pageSize: number = 20, filters?: {
    is_read?: boolean
    type?: string
    is_important?: boolean
  }) => {
    const params: any = { page, page_size: pageSize }
    if (filters) {
      Object.assign(params, filters)
    }
    return client.get<UserNotificationResponse>('/api/v1/notifications', { params })
  },

  // 获取通知详情
  getNotification: (notificationId: number) => {
    return client.get<{ data: UserNotification }>(`/api/v1/notifications/${notificationId}`)
  },

  // 获取未读通知数量
  getUnreadCount: () => {
    return client.get<{ data: { count: number } }>('/api/v1/notifications/unread-count')
  },

  // 标记通知为已读
  markAsRead: (notificationId: number) => {
    return client.put(`/api/v1/notifications/${notificationId}/read`)
  },

  // 标记多个通知为已读
  markMultipleAsRead: (notificationIds: number[]) => {
    return client.put('/api/v1/notifications/mark-read', { ids: notificationIds })
  },

  // 标记所有通知为已读
  markAllAsRead: () => {
    return client.put('/api/v1/notifications/mark-all-read')
  },

  // 删除通知
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/notifications/${notificationId}`)
  },

  // 批量删除通知
  batchDeleteNotifications: (notificationIds: number[]) => {
    return client.post('/api/v1/notifications/batch-delete', { ids: notificationIds })
  },

  // 清空所有已读通知
  clearReadNotifications: () => {
    return client.delete('/api/v1/notifications/clear-read')
  },

  // 获取通知设置
  getNotificationSettings: () => {
    return client.get<{ data: UserNotificationSettings }>('/api/v1/notifications/settings')
  },

  // 更新通知设置
  updateNotificationSettings: (settings: Partial<UserNotificationSettings>) => {
    return client.put('/api/v1/notifications/settings', settings)
  },

  // 获取应用通知偏好设置
  getNotificationPreferences: () => {
    return client.get<{ data: UserNotificationPreferences[] }>('/api/v1/notifications/preferences')
  },

  // 更新应用通知偏好设置
  updateNotificationPreferences: (appId: number, preferences: Partial<UserNotificationPreferences>) => {
    return client.put(`/api/v1/notifications/preferences/${appId}`, preferences)
  },

  // 测试通知设置
  testNotificationSettings: (type: 'email' | 'sms' | 'push') => {
    return client.post('/api/v1/notifications/test', { type })
  },

  // 获取重要通知列表
  getImportantNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<UserNotificationResponse>('/api/v1/notifications/important', {
      params: { page, page_size: pageSize }
    })
  },

  // 标记通知为重要
  markAsImportant: (notificationId: number) => {
    return client.put(`/api/v1/notifications/${notificationId}/important`)
  },

  // 取消标记重要
  unmarkAsImportant: (notificationId: number) => {
    return client.delete(`/api/v1/notifications/${notificationId}/important`)
  },

  // 订阅/取消订阅应用通知
  subscribeApp: (appId: number) => {
    return client.post(`/api/v1/notifications/subscribe/${appId}`)
  },

  unsubscribeApp: (appId: number) => {
    return client.delete(`/api/v1/notifications/subscribe/${appId}`)
  }
}
