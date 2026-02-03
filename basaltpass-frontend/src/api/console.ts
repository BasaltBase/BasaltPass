import client from './client'

export type ConsoleTarget = 'tenant' | 'admin'

export async function authorizeConsole(target: ConsoleTarget, tenantId?: number) {
  const res = await client.post('/api/v1/auth/console/authorize', {
    target,
    ...(tenantId ? { tenant_id: tenantId } : {}),
  })
  return res.data as { code: string; target: ConsoleTarget }
}

export async function exchangeConsole(code: string) {
  const res = await client.post('/api/v1/auth/console/exchange', { code })
  return res.data as { access_token: string; scope: string }
}
