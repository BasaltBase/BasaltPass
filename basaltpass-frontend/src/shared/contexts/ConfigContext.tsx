import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { getPublicConfig, PublicConfig } from '@api/config'

interface ConfigContextType {
  config: PublicConfig | null
  loading: boolean
  marketEnabled: boolean
  /** andtranslated features.wallet_recharge_withdraw_enabled translated，defaulttranslated */
  walletRechargeWithdrawEnabled: boolean
  siteName: string
  siteInitial: string
  setPageTitle: (pageTitle?: string) => void
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined)
const DEFAULT_SITE_NAME = 'BasaltPass'

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<PublicConfig | null>({
    market_enabled: true,
    wallet_recharge_withdraw_enabled: false,
    site_name: DEFAULT_SITE_NAME,
  })
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
        setConfig({
          market_enabled: true,
          wallet_recharge_withdraw_enabled: false,
          site_name: DEFAULT_SITE_NAME,
        })
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const marketEnabled = config?.market_enabled ?? true
  const walletRechargeWithdrawEnabled = config?.wallet_recharge_withdraw_enabled === true
  const siteName = config?.site_name?.trim() || DEFAULT_SITE_NAME
  const siteInitial = siteName.charAt(0).toUpperCase() || 'B'

  const setPageTitle = useCallback((pageTitle?: string) => {
    if (typeof document === 'undefined') {
      return
    }
    document.title = pageTitle ? `${siteName} - ${pageTitle}` : siteName
  }, [siteName])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const currentTitle = document.title.trim()
    if (
      !currentTitle ||
      currentTitle === DEFAULT_SITE_NAME ||
      currentTitle.startsWith(`${DEFAULT_SITE_NAME} -`)
    ) {
      setPageTitle()
    }
  }, [setPageTitle])

  return (
    <ConfigContext.Provider value={{ config, loading, marketEnabled, walletRechargeWithdrawEnabled, siteName, siteInitial, setPageTitle }}>
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
