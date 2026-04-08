import client from '../client'

export interface GiftCardCurrency {
  code: string
  name: string
  symbol: string
}

export interface GiftCardItem {
  id: number
  batch_id: number
  tenant_id: number
  code: string
  currency_id: number
  currency?: GiftCardCurrency
  amount: number
  status: 'active' | 'redeemed' | 'invalid' | 'expired'
  expires_at?: string
  redeemed_by?: number
  redeemed_at?: string
  invalidated_by?: number
  invalidated_at?: string
  reference?: string
  created_at: string
}

export interface GiftCardListResponse {
  data: GiftCardItem[]
  meta: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}

export const tenantGiftCardApi = {
  createBatch: (data: {
    currency_code: string
    amount: number
    quantity: number
    expires_at?: string
    note?: string
  }): Promise<{ data: GiftCardItem[] }> =>
    client.post('/api/v1/tenant/gift-cards/batches', data).then(response => response.data),

  list: (params?: {
    page?: number
    page_size?: number
    code?: string
    status?: string
  }): Promise<GiftCardListResponse> =>
    client.get('/api/v1/tenant/gift-cards', { params }).then(response => response.data),

  invalidate: (id: number): Promise<{ message: string }> =>
    client.post(`/api/v1/tenant/gift-cards/${id}/invalidate`).then(response => response.data),
}
