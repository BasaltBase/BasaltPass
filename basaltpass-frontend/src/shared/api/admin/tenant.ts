// managementtranslatedtenantmanagementAPI
import client from "@api/client";

// typetranslated
export interface AdminTenantListRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: string; // active, suspended, deleted
  sort_by?: string;
  sort_order?: string; // asc, desc
  created_start?: string;
  created_end?: string;
}

export interface AdminCreateTenantRequest {
  name: string;
  code: string;
  description?: string;
  owner_email: string;
  max_apps: number;
  max_users: number;
  max_tokens_per_hour: number;
  settings?: TenantSettings;
}

export interface AdminUpdateTenantRequest {
  name?: string;
  description?: string;
  status?: string;
  settings?: TenantSettings;
}

export interface TenantSettings {
  max_users: number;
  max_apps: number;
  max_tokens_per_hour: number;
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
  status: string;
  owner_id: number;
  owner_email: string;
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
  new_tenants_today: number;
  new_tenants_this_week: number;
  new_tenants_this_month: number;
}

// tenantusermanagementtranslatedtype
export interface AdminTenantUser {
  id: number;
  email: string;
  nickname: string;
  role: 'owner' | 'admin' | 'member';
  user_type: 'tenant_user' | 'app_user';
  status: string;
  app_name?: string;
  last_active_at?: string;
  created_at: string;
}

export interface AdminTenantUserApp {
  id: number;
  name: string;
  role?: string;
  added_at?: string;
}

export interface AdminTenantUserDetail extends AdminTenantUser {
  phone?: string;
  last_login_at?: string;
  updated_at?: string;
  permissions?: string[];
  apps?: AdminTenantUserApp[];
  extra_info?: Record<string, string | number | boolean | null>;
}

export interface AdminTenantInviteUserRequest {
  email: string;
  role: 'admin' | 'member';
  message?: string;
}

export interface AdminTenantUpdateUserRequest {
  role?: 'admin' | 'member';
  status?: string;
}

export interface AdminTenantUserListRequest {
  page?: number;
  limit?: number;
  search?: string;
  user_type?: 'all' | 'tenant_user' | 'app_user';
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

export interface AdminAdjustTenantUserWalletRequest {
  currency_code: string;
  amount: number;
  reason: string;
  create_if_missing?: boolean;
}

export const adminTenantApi = {
  // gettenantlist
  async getTenantList(params: AdminTenantListRequest = {}): Promise<TenantListResponse> {
    const response = await client.get('/api/v1/admin/tenants', { params });
    return response.data;
  },

  // gettenantdetails
  async getTenantDetail(id: number): Promise<AdminTenantDetailResponse> {
    const response = await client.get(`/api/v1/admin/tenants/${id}`);
    return response.data;
  },

  // createtenant
  async createTenant(data: AdminCreateTenantRequest): Promise<AdminTenantResponse> {
    const response = await client.post('/api/v1/admin/tenants', data);
    return response.data.data;
  },

  // updatetenant
  async updateTenant(id: number, data: AdminUpdateTenantRequest): Promise<void> {
    await client.put(`/api/v1/admin/tenants/${id}`, data);
  },

  // deletetenant
  async deleteTenant(id: number): Promise<void> {
    await client.delete(`/api/v1/admin/tenants/${id}`);
  },

  // gettenanttranslated
  async getTenantStats(): Promise<TenantStatsResponse> {
    const response = await client.get('/api/v1/admin/tenants/stats');
    return response.data;
  },

  // gettenantuserlist
  async getTenantUsers(tenantId: number, params: AdminTenantUserListRequest = {}): Promise<AdminTenantUserListResponse> {
    const response = await client.get(`/api/v1/admin/tenants/${tenantId}/users`, { params });
    return response.data;
  },

  // invitationtenantuser
  async inviteTenantUser(tenantId: number, data: AdminTenantInviteUserRequest): Promise<void> {
    await client.post(`/api/v1/admin/tenants/${tenantId}/users/invite`, data);
  },

  // gettenantuserdetails
  async getTenantUserDetail(tenantId: number, userId: number): Promise<AdminTenantUserDetail> {
    const response = await client.get(`/api/v1/admin/tenants/${tenantId}/users/${userId}`);
    return response.data;
  },

  // updatetenantuserpermissionorstatus
  async updateTenantUser(tenantId: number, userId: number, data: AdminTenantUpdateUserRequest): Promise<void> {
    await client.put(`/api/v1/admin/tenants/${tenantId}/users/${userId}`, data);
  },

  // translatedtenantuser
  async removeTenantUser(tenantId: number, userId: number): Promise<void> {
    await client.delete(`/api/v1/admin/tenants/${tenantId}/users/${userId}`);
  },

  async adjustTenantUserWallet(tenantId: number, userId: number, data: AdminAdjustTenantUserWalletRequest): Promise<{ message: string; tenant_id: number }> {
    const response = await client.post(`/api/v1/admin/tenants/${tenantId}/users/${userId}/wallets/adjust`, data);
    return response.data;
  },
};

export default adminTenantApi;
