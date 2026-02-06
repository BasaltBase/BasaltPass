function tokenKey(): string {
  // Per-console token key (user/tenant/admin) for least-privilege separation.
  return (import.meta as any).env?.VITE_TOKEN_KEY || 'access_token'
}

export function setAccessToken(token: string) {
  localStorage.setItem(tokenKey(), token)
}

export function getAccessToken(): string | null {
  return localStorage.getItem(tokenKey())
}

export function clearAccessToken() {
  localStorage.removeItem(tokenKey())
} 