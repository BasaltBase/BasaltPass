import client from '../client'

// usertranslatednotificationtranslated
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
  security_enabled: boolean
}

export interface UserNotificationPreferences {
  app_id: number
  app_name: string
  enabled: boolean
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
}

// usernotificationAPI
export const userNotificationApi = {
  // getusertranslatednotificationlist
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

  // getnotificationdetails
  getNotification: (notificationId: number) => {
    return client.get<{ data: UserNotification }>(`/api/v1/notifications/${notificationId}`)
  },

  // getnottranslatednotificationtranslated
  getUnreadCount: () => {
    return client.get<{ data: { count: number } }>('/api/v1/notifications/unread-count')
  },

  // translatednotificationtranslatedalreadytranslated
  markAsRead: (notificationId: number) => {
    return client.put(`/api/v1/notifications/${notificationId}/read`)
  },

  // translatednotificationtranslatedalreadytranslated
  markMultipleAsRead: (notificationIds: number[]) => {
    return client.put('/api/v1/notifications/mark-read', { ids: notificationIds })
  },

  // translatedhasnotificationtranslatedalreadytranslated
  markAllAsRead: () => {
    return client.put('/api/v1/notifications/mark-all-read')
  },

  // deletenotification
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/notifications/${notificationId}`)
  },

  // translateddeletenotification
  batchDeleteNotifications: (notificationIds: number[]) => {
    return client.post('/api/v1/notifications/batch-delete', { ids: notificationIds })
  },

  // translatedhasalreadytranslatednotification
  clearReadNotifications: () => {
    return client.delete('/api/v1/notifications/clear-read')
  },

  // getnotificationtranslated
  getNotificationSettings: () => {
    return client.get<{ data: UserNotificationSettings }>('/api/v1/notifications/settings')
  },

  // updatenotificationtranslated
  updateNotificationSettings: (settings: Partial<UserNotificationSettings>) => {
    return client.put('/api/v1/notifications/settings', settings)
  },

  // getappnotificationtranslated
  getNotificationPreferences: () => {
    return client.get<{ data: UserNotificationPreferences[] }>('/api/v1/notifications/preferences')
  },

  // updateappnotificationtranslated
  updateNotificationPreferences: (appId: number, preferences: Partial<UserNotificationPreferences>) => {
    return client.put(`/api/v1/notifications/preferences/${appId}`, preferences)
  },

  // translatednotificationtranslated
  testNotificationSettings: (type: 'email' | 'sms' | 'push') => {
    return client.post('/api/v1/notifications/test', { type })
  },

  // gettranslatednotificationlist
  getImportantNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<UserNotificationResponse>('/api/v1/notifications/important', {
      params: { page, page_size: pageSize }
    })
  },

  // translatednotificationtranslated
  markAsImportant: (notificationId: number) => {
    return client.put(`/api/v1/notifications/${notificationId}/important`)
  },

  // canceltranslated
  unmarkAsImportant: (notificationId: number) => {
    return client.delete(`/api/v1/notifications/${notificationId}/important`)
  },

  // subscription/cancelsubscriptionappnotification
  subscribeApp: (appId: number) => {
    return client.post(`/api/v1/notifications/subscribe/${appId}`)
  },

  unsubscribeApp: (appId: number) => {
    return client.delete(`/api/v1/notifications/subscribe/${appId}`)
  }
}
