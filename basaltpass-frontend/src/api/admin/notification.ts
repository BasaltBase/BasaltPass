import client from '../client'

// 管理员级别通知接口（系统管理员）
export interface AdminNotification {
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

export interface AdminCreateNotificationRequest {
  app_name: string
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
  receiver_ids?: number[] // 为空表示全站广播
  tenant_ids?: number[] // 指定租户范围
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

// 管理员通知管理API
export const adminNotificationApi = {
  // 创建全站通知
  createNotification: (data: AdminCreateNotificationRequest) => {
    return client.post('/api/v1/admin/notifications', data)
  },

  // 获取所有通知列表
  getNotifications: (page: number = 1, pageSize: number = 20, search?: string) => {
    const params: any = { page, page_size: pageSize }
    if (search) params.search = search
    return client.get<AdminNotificationResponse>('/api/v1/admin/notifications', { params })
  },

  // 获取通知详情
  getNotification: (notificationId: number) => {
    return client.get<{ data: AdminNotification }>(`/api/v1/admin/notifications/${notificationId}`)
  },

  // 更新通知
  updateNotification: (notificationId: number, data: { title: string; content: string; type: string }) => {
    return client.put(`/api/v1/admin/notifications/${notificationId}`, data)
  },

  // 删除通知
  deleteNotification: (notificationId: number) => {
    return client.delete(`/api/v1/admin/notifications/${notificationId}`)
  },

  // 获取通知统计
  getNotificationStats: () => {
    return client.get<{ data: AdminNotificationStats }>('/api/v1/admin/notifications/stats')
  },

  // 获取所有用户列表（用于选择接收者）
  getAllUsers: (search?: string) => {
    const params = search ? { search } : {}
    return client.get('/api/v1/admin/notifications/users', { params })
  },

  // 获取所有租户列表（用于选择租户范围）
  getAllTenants: (search?: string) => {
    const params = search ? { search } : {}
    return client.get('/api/v1/admin/notifications/tenants', { params })
  },

  // 批量删除通知
  batchDeleteNotifications: (notificationIds: number[]) => {
    return client.post('/api/v1/admin/notifications/batch-delete', { ids: notificationIds })
  },

  // 重新发送通知
  resendNotification: (notificationId: number, receiverIds?: number[]) => {
    return client.post(`/api/v1/admin/notifications/${notificationId}/resend`, { receiver_ids: receiverIds })
  }
}
