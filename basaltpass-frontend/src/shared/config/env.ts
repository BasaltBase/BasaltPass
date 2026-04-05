function getEnvString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

export function inferDefaultApiBase() {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8101`
  }
  return 'http://127.0.0.1:8101'
}

export function normalizeApiBase(rawBase?: string) {
  const fallback = inferDefaultApiBase()
  const value = getEnvString(rawBase, fallback)

  try {
    const url = new URL(value)
    return url.toString().replace(/\/$/, '')
  } catch {
    return fallback
  }
}

export function normalizeTimeoutMs(rawTimeout: unknown, fallback: number) {
  const parsed = Number(rawTimeout)
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  return fallback
}

export function getApiBase() {
  return normalizeApiBase(import.meta.env.VITE_API_BASE)
}

export function getApiTimeoutMs() {
  return normalizeTimeoutMs(import.meta.env.VITE_API_TIMEOUT_MS, 30000)
}

export function getAuthRequestTimeoutMs() {
  return normalizeTimeoutMs(import.meta.env.VITE_AUTH_TIMEOUT_MS, 12000)
}

export function getPublicConfigTimeoutMs() {
  return normalizeTimeoutMs(import.meta.env.VITE_PUBLIC_CONFIG_TIMEOUT_MS, 5000)
}

export function getPublicTenantTimeoutMs() {
  return normalizeTimeoutMs(import.meta.env.VITE_PUBLIC_TENANT_TIMEOUT_MS, 15000)
}

export function getConsoleUserUrl() {
  return getEnvString(import.meta.env.VITE_CONSOLE_USER_URL)
}

export function getConsoleTenantUrl() {
  return getEnvString(import.meta.env.VITE_CONSOLE_TENANT_URL)
}

export function getConsoleAdminUrl() {
  return getEnvString(import.meta.env.VITE_CONSOLE_ADMIN_URL)
}
