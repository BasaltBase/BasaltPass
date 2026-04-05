import { useEffect, useState } from 'react'
import { fetchPublicTenantByCode } from '@api/public/tenant'
import type { TenantInfo } from './types'

interface UseTenantInfoOptions {
  tenantCode?: string
  setPageTitle: (title: string) => void
  onError: (message: string) => void
}

export function useTenantInfo({ tenantCode, setPageTitle, onError }: UseTenantInfoOptions) {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [loadingTenant, setLoadingTenant] = useState(true)

  useEffect(() => {
    if (tenantInfo?.name) {
      document.title = `${tenantInfo.name} - 登录`
    } else {
      setPageTitle('租户登录')
    }

    return () => {
      setPageTitle('用户中心')
    }
  }, [setPageTitle, tenantInfo?.name])

  useEffect(() => {
    let cancelled = false

    const loadTenantInfo = async () => {
      if (!tenantCode) {
        setTenantInfo(null)
        setLoadingTenant(false)
        onError('租户代码缺失，请检查访问链接')
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
          onError('加载租户信息超时，请检查后端服务是否可用')
        } else {
          onError('租户不存在或已被禁用')
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
  }, [onError, tenantCode])

  return {
    tenantInfo,
    loadingTenant,
  }
}
