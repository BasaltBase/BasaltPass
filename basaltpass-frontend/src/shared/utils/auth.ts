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
  return getTokenKeyForScope(getAuthScope())
}

export function getTokenKeyForScope(scope: ConsoleScope): string {
  const envTokenKey = (import.meta as any).env?.VITE_TOKEN_KEY
  if (envTokenKey && scope === getAuthScope()) {
    return envTokenKey
  }

  switch (scope) {
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

export function clearAccessTokenForScope(scope: ConsoleScope) {
  localStorage.removeItem(getTokenKeyForScope(scope))
}

function expireCookie(name: string) {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

export function clearScopeCookies(scope: ConsoleScope) {
  if (scope === 'user') {
    expireCookie('access_token')
    expireCookie('refresh_token')
    return
  }

  expireCookie(`access_token_${scope}`)
  expireCookie(`refresh_token_${scope}`)
}
