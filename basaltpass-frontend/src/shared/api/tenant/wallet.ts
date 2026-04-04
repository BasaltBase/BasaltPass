import client from '../client'

export interface TenantCurrency {
  id: number;
  code: string;
  name: string;
  name_cn: string;
  symbol: string;
  decimal_places: number;
  type: 'fiat' | 'crypto' | 'points';
  is_active: boolean;
}

export interface TenantWallet {
  id: number;
  user_id?: number;
  team_id?: number;
  currency_id: number;
  balance: number;
  status: 'active' | 'frozen';
  created_at: string;
  updated_at: string;
  currency: TenantCurrency;
  user?: {
    id: number;
    username: string;
    email: string;
  };
  team?: {
    id: number;
    name: string;
  };
}

export interface TenantWalletTransaction {
  id: number;
  wallet_id: number;
  type: string;
  amount: number;
  status: string;
  reference?: string;
  created_at: string;
  updated_at?: string;
}

export interface TenantWalletStats {
  total_wallets: number;
  active_wallets: number;
  frozen_wallets: number;
  currency_balances: Array<{
    currency_code: string;
    total_balance: number;
  }>;
  recent_transactions_24h: number;
}

export interface TenantAdjustOwnerWalletRequest {
  currency_code: string;
  amount: number;
  reason: string;
  create_if_missing?: boolean;
}

export interface TenantListWalletsParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  team_id?: number;
  currency_code?: string;
}

export interface TenantPaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const tenantWalletApi = {
  getWallets: (params?: TenantListWalletsParams): Promise<TenantPaginatedResponse<TenantWallet>> =>
    client.get('/api/v1/tenant/wallets', { params }).then(response => response.data),

  getWalletStats: (): Promise<{ data: TenantWalletStats }> =>
    client.get('/api/v1/tenant/wallets/stats').then(response => response.data),

  getCurrencies: (): Promise<{ data: TenantCurrency[] }> =>
    client.get('/api/v1/tenant/currencies').then(response => response.data),

  getWalletTransactions: (walletId: number, params?: { page?: number; page_size?: number }): Promise<TenantPaginatedResponse<TenantWalletTransaction>> =>
    client.get(`/api/v1/tenant/wallets/${walletId}/transactions`, { params }).then(response => response.data),

  getUserWallets: (userId: number): Promise<{ data: TenantWallet[] }> =>
    client.get(`/api/v1/tenant/users/${userId}/wallets`).then(response => response.data),

  getTeamWallets: (teamId: number): Promise<{ data: TenantWallet[] }> =>
    client.get(`/api/v1/tenant/teams/${teamId}/wallets`).then(response => response.data),

  adjustUserWallet: (userId: number, data: TenantAdjustOwnerWalletRequest): Promise<{ message: string; data: TenantWallet }> =>
    client.post(`/api/v1/tenant/users/${userId}/wallets/adjust`, data).then(response => response.data),

  adjustTeamWallet: (teamId: number, data: TenantAdjustOwnerWalletRequest): Promise<{ message: string; data: TenantWallet }> =>
    client.post(`/api/v1/tenant/teams/${teamId}/wallets/adjust`, data).then(response => response.data),
}
