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
  receiver_ids?: number[] // translatedortranslated
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
  // getusertranslatednotificationlist
  getUserNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/notifications?page=${page}&page_size=${pageSize}`)
  },

  // getnottranslatednotificationtranslated
  getUnreadCount: () => {
    return client.get<{ count: number }>('/api/v1/notifications/unread-count')
  },

  // translatednotificationtranslatedalreadytranslated
  markAsRead: (notificationId: number) => {
    return client.put(`/api/v1/notifications/${notificationId}/read`)
  },

  // translatedhasnotificationtranslatedalreadytranslated
  markAllAsRead: () => {
    return client.put('/api/v1/notifications/mark-all-read')
  },

  // deletenotification
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/notifications/${notificationId}`)
  },

  // managementtranslated：createnotification
  createNotification: (data: CreateNotificationRequest) => {
    return client.post('/api/v1/tenant/notifications', data)
  },

  // managementtranslated：gettranslatedhasnotification
  getAllNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/tenant/notifications?page=${page}&page_size=${pageSize}`)
  },

  // managementtranslated：deletenotification
  deleteNotificationAdmin: (notificationId: number) => {
    return client.delete(`/api/v1/tenant/notifications/${notificationId}`)
  }
}

// tenantnotificationmanagementAPI
export const tenantNotificationApi = {
  // tenant：createnotification（translatedtenanttranslateduser）
  createNotification: (data: CreateNotificationRequest) => {
    return client.post('/api/v1/tenant/notifications', data)
  },

  // tenant：getalreadytranslatednotificationlist
  getNotifications: (page: number = 1, pageSize: number = 20) => {
    return client.get<NotificationResponse>(`/api/v1/tenant/notifications?page=${page}&page_size=${pageSize}`)
  },

  // tenant：getnotificationdetails
  getNotification: (notificationId: number) => {
    return client.get(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // tenant：updatenotification
  updateNotification: (notificationId: number, data: { title: string; content: string; type: string }) => {
    return client.put(`/api/v1/tenant/notifications/${notificationId}`, data)
  },

  // tenant：deletenotification
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // tenant：gettenanttranslateduserlist（translatednotificationtranslated）
  getTenantUsers: (search?: string) => {
    const params = search ? { search } : {}
    return client.get('/api/v1/tenant/notifications/users', { params })
  },

  // tenant：searchuser（translatedemail、translated）
  searchTenantUsers: (search: string) => {
    return client.get('/api/v1/tenant/notifications/users/search', { 
      params: { search } 
    })
  },

  // tenant：getnotificationtranslatedinfo
  getNotificationStats: () => {
    return client.get<{ data: TenantNotificationStats }>('/api/v1/tenant/notifications/stats')
  }
} 