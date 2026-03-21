export type ConsoleScope = 'user' | 'tenant' | 'admin'

export function getAuthScope(): ConsoleScope {
  const envScope = (import.meta as any).env?.VITE_AUTH_SCOPE
  if (envScope === 'user' || envScope === 'tenant' || envScope === 'admin') {
    return envScope
  }

  if (typeof window !== 'undefined') {
    const path = window.location.pathname || '/'
    if (path.startsWith('/admin')) return 'admin'
    if (path.startsWith('/tenant')) return 'tenant'
  }

  return 'user'
}

export function getTokenKey(): string {
  const envTokenKey = (import.meta as any).env?.VITE_TOKEN_KEY
  if (envTokenKey) {
    return envTokenKey
  }

  switch (getAuthScope()) {
    case 'admin':
      return 'bp_admin_access_token'
    case 'tenant':
      return 'bp_tenant_access_token'
    default:
      return 'bp_user_access_token'
  }
}

export function setAccessToken(token: string) {
  localStorage.setItem(getTokenKey(), token)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(getTokenKey())
}

export function clearAccessToken() {
  localStorage.removeItem(getTokenKey())
} 