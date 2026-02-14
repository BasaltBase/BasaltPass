import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { getPublicConfig, PublicConfig } from '@api/config'

interface ConfigContextType {
  config: PublicConfig | null
  loading: boolean
  marketEnabled: boolean
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicConfig | null>({ market_enabled: true })
  const [loading, setLoading] = useState(false)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) {
      return
    }
    hasFetchedRef.current = true

    const fetchConfig = async () => {
      try {
        setLoading(true)
        const data = await getPublicConfig()
        setConfig(data)
      } catch {
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
