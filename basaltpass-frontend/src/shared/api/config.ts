import client from './client'

export interface PublicConfig {
  market_enabled: boolean
}

class ConfigAPI {
  async getPublicConfig(): Promise<PublicConfig> {
    const response = await client.get('/api/v1/config')
    return response.data
  }
}

const configAPI = new ConfigAPI()

export const getPublicConfig = () => configAPI.getPublicConfig()

export default configAPI
