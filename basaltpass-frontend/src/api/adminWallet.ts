import api from './client';

export interface Currency {
  id: number;
  code: string;
  name: string;
  name_cn: string;
  symbol: string;
  decimal_places: number;
  type: 'fiat' | 'crypto' | 'points';
  is_active: boolean;
  sort_order: number;
  description: string;
}

export interface Wallet {
  id: number;
  user_id?: number;
  team_id?: number;
  currency_id: number;
  balance: number;
  status: 'active' | 'frozen';
  created_at: string;
  updated_at: string;
  currency: Currency;
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

export interface WalletTransaction {
  id: number;
  wallet_id: number;
  type: string;
  amount: number;
  status: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface WalletStats {
  total_wallets: number;
  active_wallets: number;
  frozen_wallets: number;
  currency_balances: Array<{
    currency_code: string;
    total_balance: number;
  }>;
  recent_transactions_24h: number;
}

export interface CreateWalletRequest {
  user_id?: number;
  team_id?: number;
  currency_code: string;
  initial_balance: number;
}

export interface AdjustBalanceRequest {
  amount: number;
  reason: string;
}

export interface ListWalletsParams {
  page?: number;
  page_size?: number;
  user_id?: number;
  team_id?: number;
  currency_code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export const adminWalletApi = {
  // 获取钱包列表
  getWallets: (params?: ListWalletsParams): Promise<PaginatedResponse<Wallet>> =>
    api.get('/api/v1/admin/wallets', { params }).then(response => response.data),

  // 获取钱包统计
  getWalletStats: (): Promise<{ data: WalletStats }> =>
    api.get('/api/v1/admin/wallets/stats').then(response => response.data),

  // 创建钱包
  createWallet: (data: CreateWalletRequest): Promise<{ data: Wallet }> =>
    api.post('/api/v1/admin/wallets', data).then(response => response.data),

  // 调整余额
  adjustBalance: (walletId: number, data: AdjustBalanceRequest): Promise<{ message: string }> =>
    api.post(`/api/v1/admin/wallets/${walletId}/adjust`, data).then(response => response.data),

  // 冻结钱包
  freezeWallet: (walletId: number): Promise<{ message: string }> =>
    api.post(`/api/v1/admin/wallets/${walletId}/freeze`).then(response => response.data),

  // 解冻钱包
  unfreezeWallet: (walletId: number): Promise<{ message: string }> =>
    api.post(`/api/v1/admin/wallets/${walletId}/unfreeze`).then(response => response.data),

  // 删除钱包
  deleteWallet: (walletId: number): Promise<{ message: string }> =>
    api.delete(`/api/v1/admin/wallets/${walletId}`).then(response => response.data),

  // 获取钱包交易记录
  getWalletTransactions: (
    walletId: number,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<WalletTransaction>> =>
    api.get(`/api/v1/admin/wallets/${walletId}/transactions`, { params }).then(response => response.data),

  // 获取用户钱包
  getUserWallets: (userId: number): Promise<{ data: Wallet[] }> =>
    api.get(`/api/v1/admin/users/${userId}/wallets`).then(response => response.data),

  // 获取团队钱包
  getTeamWallets: (teamId: number): Promise<{ data: Wallet[] }> =>
    api.get(`/api/v1/admin/teams/${teamId}/wallets`).then(response => response.data),

  // 获取货币列表
  getCurrencies: (): Promise<{ data: Currency[] }> =>
    api.get('/api/v1/admin/currencies').then(response => response.data),
};
