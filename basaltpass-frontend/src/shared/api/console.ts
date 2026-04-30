import axios from 'axios'
import client from './client'

export type ConsoleTarget = 'tenant' | 'admin'

const consoleClient = axios.create({
  baseURL: String(client.defaults.baseURL || '').replace(/\/$/, ''),
  withCredentials: true,
  timeout: typeof client.defaults.timeout === 'number' ? client.defaults.timeout : 30000,
})

export function joinConsoleUrl(base: string, path: string) {
  const normalizedBase = String(base || '').replace(/\/+$/, '')
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  if (!normalizedBase) {
    return `/${normalizedPath}`
  }

  const baseLastSegment = normalizedBase.split('/').filter(Boolean).pop()
  const pathFirstSegment = normalizedPath.split('/').filter(Boolean)[0]
  if (baseLastSegment && pathFirstSegment && baseLastSegment === pathFirstSegment) {
    return `${normalizedBase}/${normalizedPath.split('/').slice(1).join('/')}`
  }

  return `${normalizedBase}/${normalizedPath}`
}

export async function authorizeConsole(target: ConsoleTarget, tenantId?: number) {
  const res = await client.post('/api/v1/auth/console/authorize', {
    target,
    ...(tenantId ? { tenant_id: tenantId } : {}),
  })
  return res.data as { code: string; target: ConsoleTarget }
}

export async function authorizeConsoleWithToken(accessToken: string, target: ConsoleTarget, tenantId?: number) {
  const res = await consoleClient.post(
    '/api/v1/auth/console/authorize',
    {
      target,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Auth-Scope': 'user',
      },
    },
  )
  return res.data as { code: string; target: ConsoleTarget }
}

export async function exchangeConsole(code: string) {
  const res = await consoleClient.post('/api/v1/auth/console/exchange', { code })
  return res.data as { access_token: string; scope: string }
}
