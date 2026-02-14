import client from './client'

export interface PublicConfig {
  market_enabled: boolean
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
