import { useEffect, useState } from 'react'
import { fetchPublicTenantByCode } from '@api/public/tenant'
import { useI18n } from '@shared/i18n'
import type { TenantInfo } from './types'

interface UseTenantInfoOptions {
  tenantCode?: string
  setPageTitle: (title: string) => void
  onError: (message: string) => void
}

export function useTenantInfo({ tenantCode, setPageTitle, onError }: UseTenantInfoOptions) {
  const { t } = useI18n()
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [loadingTenant, setLoadingTenant] = useState(true)

  useEffect(() => {
    if (tenantInfo?.name) {
      document.title = t('auth.tenant.documentTitle', { tenantName: tenantInfo.name })
    } else {
      setPageTitle(t('auth.tenant.subtitle'))
    }

    return () => {
      setPageTitle(t('userLayout.pageTitle'))
    }
  }, [setPageTitle, t, tenantInfo?.name])

  useEffect(() => {
    let cancelled = false

    const loadTenantInfo = async () => {
      if (!tenantCode) {
        setTenantInfo(null)
        setLoadingTenant(false)
        onError(t('auth.tenant.flow.missingTenantCode'))
        return
      }

      try {
        setLoadingTenant(true)
        onError('')
        const tenant = await fetchPublicTenantByCode(tenantCode)
        if (!cancelled) {
          setTenantInfo(tenant)
        }
      } catch (error: unknown) {
        if (cancelled) {
          return
        }

        const code = typeof error === 'object' && error && 'code' in error ? error.code : ''
        if (code === 'ECONNABORTED') {
          onError(t('auth.tenant.flow.loadTenantTimeout'))
        } else {
          onError(t('auth.tenant.notFoundDescription'))
        }
        setTenantInfo(null)
      } finally {
        if (!cancelled) {
          setLoadingTenant(false)
        }
      }
    }

    loadTenantInfo()

    return () => {
      cancelled = true
    }
  }, [onError, t, tenantCode])

  return {
    tenantInfo,
    loadingTenant,
  }
}
