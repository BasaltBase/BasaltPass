import client from '../client'

export const userGiftCardApi = {
  redeem: (code: string): Promise<{ data: { code: string; amount: number; status: string } }> =>
    client.post('/api/v1/wallet/gift-cards/redeem', { code }).then(response => response.data),
}
