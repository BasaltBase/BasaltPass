import client from '../client'

// managementtranslatednotificationtranslated（systemmanagementtranslated）
export interface AdminNotification {
  id: number
  receiver_id: number
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

export interface AdminCreateNotificationRequest {
  app_name: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  receiver_ids?: number[] // translated
  tenant_ids?: number[] // translatedtenanttranslated
}

export interface AdminNotificationResponse {
  data: AdminNotification[]
  total: number
  page: number
  page_size: number
}

export interface AdminNotificationStats {
  total_sent: number
  total_read: number
  total_unread: number
  read_rate: number
  type_stats: Record<string, number>
  tenant_stats: Array<{
    tenant_id: number
    tenant_name: string
    count: number
  }>
  recent_activity: Array<{
    date: string
    count: number
  }>
}

// managementtranslatednotificationmanagementAPI
export const adminNotificationApi = {
  // createtranslatednotification
  createNotification: (data: AdminCreateNotificationRequest) => {
    return client.post('/api/v1/admin/notifications', data)
  },

  // gettranslatedhasnotificationlist
  getNotifications: (page: number = 1, pageSize: number = 20, search?: string) => {
    const params: any = { page, page_size: pageSize }
    if (search) params.search = search
    return client.get<AdminNotificationResponse>('/api/v1/admin/notifications', { params })
  },

  // getnotificationdetails
  getNotification: (notificationId: number) => {
    return client.get<{ data: AdminNotification }>(`/api/v1/admin/notifications/${notificationId}`)
  },

  // updatenotification
  updateNotification: (notificationId: number, data: { title: string; content: string; type: string }) => {
    return client.put(`/api/v1/admin/notifications/${notificationId}`, data)
  },

  // deletenotification
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/admin/notifications/${notificationId}`)
  },

  // getnotificationtranslated
  getNotificationStats: () => {
    return client.get<{ data: AdminNotificationStats }>('/api/v1/admin/notifications/stats')
  },

  // gettranslatedhasuserlist（translated）
  getAllUsers: (search?: string) => {
    const params = search ? { search } : {}
    return client.get('/api/v1/admin/notifications/users', { params })
  },

  // gettranslatedhastenantlist（translatedtenanttranslated）
  getAllTenants: (search?: string) => {
    const params = search ? { search } : {}
    return client.get('/api/v1/admin/notifications/tenants', { params })
  },

  // translateddeletenotification
  batchDeleteNotifications: (notificationIds: number[]) => {
    return client.post('/api/v1/admin/notifications/batch-delete', { ids: notificationIds })
  },

  // translatednotification
  resendNotification: (notificationId: number, receiverIds?: number[]) => {
    return client.post(`/api/v1/admin/notifications/${notificationId}/resend`, { receiver_ids: receiverIds })
  }
}
