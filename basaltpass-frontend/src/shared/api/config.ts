import client from './client'

export interface PublicConfig {
  market_enabled: boolean
  /** 用户钱包充值/提现总开关；未返回或非 true 时视为关闭 */
  wallet_recharge_withdraw_enabled?: boolean
  site_name: string
}

class ConfigAPI {
  private readonly timeoutMs: number

  constructor() {
    const raw = Number((import.meta as any).env?.VITE_PUBLIC_CONFIG_TIMEOUT_MS)
    this.timeoutMs = Number.isFinite(raw) && raw > 0 ? raw : 5000
  }

  async getPublicConfig(): Promise<PublicConfig> {
    const response = await client.get('/api/v1/config', { timeout: this.timeoutMs })
    return response.data
  }
}

const configAPI = new ConfigAPI()

export const getPublicConfig = () => configAPI.getPublicConfig()

export default configAPI
