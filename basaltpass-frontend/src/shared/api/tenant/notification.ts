import client from '../client'

// tenanttranslatednotificationtranslated
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
  receiver_ids?: number[] // translatedtenanttranslatedhasuser
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

// tenantnotificationmanagementAPI
export const tenantNotificationApi = {
  // createnotification（translatedtenanttranslateduser）
  createNotification: (data: TenantCreateNotificationRequest) => {
    return client.post('/api/v1/tenant/notifications', data)
  },

  // getalreadytranslatednotificationlist
  getNotifications: (page: number = 1, pageSize: number = 20, search?: string) => {
    const params: any = { page, page_size: pageSize }
    if (search) params.search = search
    return client.get<TenantNotificationResponse>('/api/v1/tenant/notifications', { params })
  },

  // getnotificationdetails
  getNotification: (notificationId: number) => {
    return client.get<{ data: TenantNotification }>(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // updatenotification
  updateNotification: (notificationId: number, data: { title: string; content: string; type: string }) => {
    return client.put(`/api/v1/tenant/notifications/${notificationId}`, data)
  },

  // deletenotification
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/tenant/notifications/${notificationId}`)
  },

  // getnotificationtranslatedinfo
  getNotificationStats: () => {
    return client.get<{ data: TenantNotificationStats }>('/api/v1/tenant/notifications/stats')
  },

  // gettenanttranslateduserlist（translatednotificationtranslated）
  getTenantUsers: (search?: string) => {
    const params = search ? { search } : {}
    return client.get<{ data: TenantUser[] }>('/api/v1/tenant/notifications/users', { params })
  },

  // searchuser（email、translated、phone number）
  searchTenantUsers: (search: string) => {
    return client.get<{ data: TenantUser[] }>('/api/v1/tenant/notifications/users/search', {
      params: { search },
    })
  },

  // gettenanttranslatedapplist（translatedapp）
  getTenantApps: () => {
    return client.get('/api/v1/tenant/apps')
  },

  // translateddeletenotification
  batchDeleteNotifications: (notificationIds: number[]) => {
    return client.post('/api/v1/tenant/notifications/batch-delete', { ids: notificationIds })
  },

  // translatednotification（translatedalreadytranslated）
  revokeNotification: (notificationId: number) => {
    return client.post(`/api/v1/tenant/notifications/${notificationId}/revoke`)
  },

  // getnotificationtranslated
  getNotificationLog: (notificationId: number) => {
    return client.get(`/api/v1/tenant/notifications/${notificationId}/log`)
  }
}
