import client from '../client'

export interface Currency {
  id: number
  code: string
  name: string
  name_cn: string
  symbol: string
  decimal_places: number
  type: string
  is_active: boolean
  sort_order: number
  description: string
  icon_url?: string
}

export const getCurrencies = () => client.get<Currency[]>('/api/v1/currencies')
export const getCurrency = (code: string) => client.get<Currency>(`/api/v1/currencies/${code}`)
