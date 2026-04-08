import api from '../client'

export interface AdminGiftCard {
  id: number
  batch_id: number
  tenant_id: number
  code: string
  amount: number
  status: 'active' | 'redeemed' | 'invalid' | 'expired'
  expires_at?: string
  redeemed_by?: number
  redeemed_at?: string
  invalidated_by?: number
  invalidated_at?: string
  reference?: string
  created_at: string
  currency?: {
    code: string
    name: string
    symbol: string
  }
}

export const adminGiftCardApi = {
  getByCode: (code: string): Promise<{ data: AdminGiftCard }> =>
    api.get(`/api/v1/admin/gift-cards/${encodeURIComponent(code)}`).then(response => response.data),
}
