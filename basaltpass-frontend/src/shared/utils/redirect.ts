export function resolveSafeRedirectTarget(rawRedirect: string, baseUrl: string): string | null {
  const redirect = String(rawRedirect || '').trim()
  const normalizedBase = String(baseUrl || '').trim()

  if (!redirect || !normalizedBase) {
    return null
  }

  try {
    const base = new URL(normalizedBase)
    const target = new URL(redirect, base)

    if (!/^https?:$/.test(target.protocol)) {
      return null
    }

    if (target.origin !== base.origin) {
      return null
    }

    return target.toString()
  } catch {
    return null
  }
}
