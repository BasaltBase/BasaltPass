import client from './client';

export interface TenantNotification {
  id: number;
  app_id: number;
  app: {
    id: number;
    name: string;
  };
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  sender_id?: number;
  sender_name: string;
  receiver_id: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface TenantCreateNotificationRequest {
  app_name: string;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  receiver_ids: number[];
}

export interface TenantUser {
  id: number;
  email: string;
  phone: string;
  nickname?: string;
}

// 创建通知
export const createTenantNotification = (data: TenantCreateNotificationRequest) => {
  return client.post('/api/v1/admin/notifications', data);
};

// 获取通知列表
export const getTenantNotifications = (params: {
  page?: number;
  page_size?: number;
}) => {
  return client.get<{
    data: TenantNotification[];
    total: number;
    page: number;
    page_size: number;
  }>('/api/v1/admin/notifications', { params });
};

// 删除通知
export const deleteTenantNotification = (id: number) => {
  return client.delete(`/api/v1/admin/notifications/${id}`);
};

// 获取租户用户列表
export const getTenantUsers = (search?: string) => {
  return client.get<{ data: TenantUser[] }>('/api/v1/admin/notifications/users', {
    params: search ? { search } : undefined,
  });
};
