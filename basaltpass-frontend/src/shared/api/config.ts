import client from './client'
import { getPublicConfigTimeoutMs } from '../config/env'

export interface PublicConfig {
  market_enabled: boolean
  /** 用户钱包充值/提现总开关；未返回或非 true 时视为关闭 */
  wallet_recharge_withdraw_enabled?: boolean
  site_name: string
}

class ConfigAPI {
  private readonly timeoutMs: number

  constructor() {
    this.timeoutMs = getPublicConfigTimeoutMs()
  }

  async getPublicConfig(): Promise<PublicConfig> {
    const response = await client.get('/api/v1/config', { timeout: this.timeoutMs })
    return response.data
  }
}

const configAPI = new ConfigAPI()

export const getPublicConfig = () => configAPI.getPublicConfig()

export default configAPI
