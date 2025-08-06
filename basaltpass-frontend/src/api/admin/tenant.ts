// 管理员租户管理API
import client from "@api/client";

// 类型定义
export interface AdminTenantListRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // active, suspended, deleted
  plan?: string;   // free, pro, enterprise
  sort_by?: string;
  sort_order?: string; // asc, desc
  created_start?: string;
  created_end?: string;
}

export interface AdminCreateTenantRequest {
  name: string;
  code: string;
  description?: string;
  plan: string;
  owner_email: string;
  settings?: TenantSettings;
}

export interface AdminUpdateTenantRequest {
  name?: string;
  description?: string;
  plan?: string;
  status?: string;
  settings?: TenantSettings;
}

export interface TenantSettings {
  max_users: number;
  max_apps: number;
  max_storage: number; // MB
  enable_api: boolean;
  enable_sso: boolean;
  enable_audit: boolean;
}

export interface AdminTenantResponse {
  id: number;
  name: string;
  code: string;
  description: string;
  plan: string;
  status: string;
  owner_id: number;
  owner_email: string;
  owner_name: string;
  user_count: number;
  app_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminTenantDetailResponse extends AdminTenantResponse {
  settings: TenantSettings;
  stats: TenantStats;
  recent_users: RecentUser[];
  recent_apps: RecentApp[];
}

export interface TenantStats {
  total_users: number;
  active_users: number;
  total_apps: number;
  active_apps: number;
  storage_used: number;
  api_calls_this_month: number;
  last_active_at?: string;
}

export interface RecentUser {
  id: number;
  email: string;
  nickname: string;
  created_at: string;
}

export interface RecentApp {
  id: number;
  name: string;
  type: string;
  created_at: string;
}

export interface TenantListResponse {
  tenants: AdminTenantResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface TenantStatsResponse {
  total_tenants: number;
  active_tenants: number;
  suspended_tenants: number;
  deleted_tenants: number;
  free_plan_tenants: number;
  pro_plan_tenants: number;
  enterprise_plan_tenants: number;
  new_tenants_today: number;
  new_tenants_this_week: number;
  new_tenants_this_month: number;
}

// 租户用户管理相关类型
export interface AdminTenantUser {
  id: number;
  email: string;
  nickname: string;
  role: 'owner' | 'admin' | 'member';
  user_type: 'tenant_admin' | 'app_user';
  status: string;
  app_name?: string;
  last_active_at?: string;
  created_at: string;
}

export interface AdminTenantUserListRequest {
  page?: number;
  limit?: number;
  search?: string;
  user_type?: 'all' | 'tenant_admin' | 'app_user';
  role?: string;
  status?: string;
}

export interface AdminTenantUserListResponse {
  users: AdminTenantUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export const adminTenantApi = {
  // 获取租户列表
  async getTenantList(params: AdminTenantListRequest = {}): Promise<TenantListResponse> {
    const response = await client.get('/api/v1/admin/tenants', { params });
    return response.data;
  },

  // 获取租户详情
  async getTenantDetail(id: number): Promise<AdminTenantDetailResponse> {
    const response = await client.get(`/api/v1/admin/tenants/${id}`);
    return response.data;
  },

  // 创建租户
  async createTenant(data: AdminCreateTenantRequest): Promise<AdminTenantResponse> {
    const response = await client.post('/api/v1/admin/tenants', data);
    return response.data.data;
  },

  // 更新租户
  async updateTenant(id: number, data: AdminUpdateTenantRequest): Promise<void> {
    await client.put(`/api/v1/admin/tenants/${id}`, data);
  },

  // 删除租户
  async deleteTenant(id: number): Promise<void> {
    await client.delete(`/api/v1/admin/tenants/${id}`);
  },

  // 获取租户统计
  async getTenantStats(): Promise<TenantStatsResponse> {
    const response = await client.get('/api/v1/admin/tenants/stats');
    return response.data;
  },

  // 获取租户用户列表
  async getTenantUsers(tenantId: number, params: AdminTenantUserListRequest = {}): Promise<AdminTenantUserListResponse> {
    const response = await client.get(`/api/v1/admin/tenants/${tenantId}/users`, { params });
    return response.data;
  },

  // 移除租户用户
  async removeTenantUser(tenantId: number, userId: number): Promise<void> {
    await client.delete(`/api/v1/admin/tenants/${tenantId}/users/${userId}`);
  },
};

export default adminTenantApi;