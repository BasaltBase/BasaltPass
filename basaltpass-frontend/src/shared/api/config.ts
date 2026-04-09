import client from './client'
import { getPublicConfigTimeoutMs } from '../config/env'

export interface PublicConfig {
  market_enabled: boolean
  /** usertranslatedvalue/translated；notbackortranslated true translated */
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
