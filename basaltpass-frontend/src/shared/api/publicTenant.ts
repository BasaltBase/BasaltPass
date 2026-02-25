import axios from 'axios'

type TenantPublicInfo = {
  id: number
  name: string
  code: string
}

const tenantDataCache = new Map<string, TenantPublicInfo>()
const tenantInFlightCache = new Map<string, Promise<TenantPublicInfo>>()
const tenantRequestTimeoutMs = Number((import.meta as any).env?.VITE_PUBLIC_TENANT_TIMEOUT_MS || 15000)

const inferDefaultApiBase = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8101`
  }
  return 'http://localhost:8101'
}

const buildBaseCandidates = () => {
  const base = String((import.meta as any).env?.VITE_API_BASE || inferDefaultApiBase()).replace(/\/$/, '')
  const candidates = [base]
  if (base.includes('localhost')) {
    candidates.push(base.replace('localhost', '127.0.0.1'))
  } else if (base.includes('127.0.0.1')) {
    candidates.push(base.replace('127.0.0.1', 'localhost'))
  }
  return [...new Set(candidates)]
}

export async function fetchPublicTenantByCode(tenantCode: string): Promise<TenantPublicInfo> {
  const normalizedCode = String(tenantCode || '').trim()
  if (!normalizedCode) {
    throw new Error('tenant code is required')
  }

  if (tenantDataCache.has(normalizedCode)) {
    return tenantDataCache.get(normalizedCode) as TenantPublicInfo
  }

  if (tenantInFlightCache.has(normalizedCode)) {
    return tenantInFlightCache.get(normalizedCode) as Promise<TenantPublicInfo>
  }

  const request = (async () => {
    let lastError: any = null
    const baseCandidates = buildBaseCandidates()

    for (const candidate of baseCandidates) {
      try {
        const url = `${candidate}/api/v1/tenants/by-code/${normalizedCode}`
        const res = await axios.get(url, {
          withCredentials: false,
          timeout: tenantRequestTimeoutMs,
        })
        const data = res.data as TenantPublicInfo
        tenantDataCache.set(normalizedCode, data)
        return data
      } catch (err: any) {
        lastError = err
      }
    }

    throw lastError || new Error('tenant info request failed')
  })()

  tenantInFlightCache.set(normalizedCode, request)

  try {
    return await request
  } finally {
    tenantInFlightCache.delete(normalizedCode)
  }
}
