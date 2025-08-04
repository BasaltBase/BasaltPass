import client from '../client'

export const getBalance = (currency: string) => client.get('/api/v1/wallet/balance', { params: { currency } })
export const recharge = (currency: string, amount: number) => client.post('/api/v1/wallet/recharge', { currency, amount })
export const withdraw = (currency: string, amount: number) => client.post('/api/v1/wallet/withdraw', { currency, amount })
export const history = (currency: string, limit = 20) => client.get('/api/v1/wallet/history', { params: { currency, limit } }) 