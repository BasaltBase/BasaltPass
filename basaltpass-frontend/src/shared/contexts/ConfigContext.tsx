import React, { createContext, useContext, useState, useEffect } from 'react'
import { getPublicConfig, PublicConfig } from '@api/config'

interface ConfigContextType {
  config: PublicConfig | null
  loading: boolean
  marketEnabled: boolean
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const data = await getPublicConfig()
        setConfig(data)
      } catch (error) {
        console.error('Failed to load config:', error)
        // 如果加载失败，使用默认配置
        setConfig({ market_enabled: true })
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const marketEnabled = config?.market_enabled ?? true

  return (
    <ConfigContext.Provider value={{ config, loading, marketEnabled }}>
      {children}
    </ConfigContext.Provider>
  )
}

export const useConfig = () => {
  const context = useContext(ConfigContext)
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider')
  }
  return context
}
