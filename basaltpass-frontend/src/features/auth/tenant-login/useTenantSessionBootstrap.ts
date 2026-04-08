import { useEffect, useRef, useState } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { ROUTES } from '@constants'
import { getAccessToken } from '@utils/auth'
import { decodeJWT } from '@utils/jwt'
import { pruneExpiredUserConsoleSessions, removeUserConsoleSessionByKey } from '@utils/userSessions'
import type { TenantInfo } from './types'

interface UseTenantSessionBootstrapOptions {
  isAuthenticated: boolean
  isAuthLoading: boolean
  login: (token: string) => Promise<void>
  navigate: NavigateFunction
  redirectAfterLogin: () => boolean
  tenantInfo: TenantInfo | null
}

export function useTenantSessionBootstrap({
  isAuthenticated,
  isAuthLoading,
  login,
  navigate,
  redirectAfterLogin,
  tenantInfo,
}: UseTenantSessionBootstrapOptions) {
  const [isResolvingTenantSession, setIsResolvingTenantSession] = useState(true)
  const attemptedSessionKeysRef = useRef<Set<string>>(new Set())
  const inFlightSessionKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!tenantInfo?.id) {
      return
    }

    if (isAuthLoading) {
      return
    }

    const targetTenantID = tenantInfo.id
    const activeToken = getAccessToken()
    const activeDecoded = activeToken ? decodeJWT(activeToken) : null
    const activeTenantID = Number(activeDecoded?.tid || 0)
    const activeScope = String(activeDecoded?.scp || 'user')

    if (isAuthenticated && activeScope === 'user' && activeTenantID === targetTenantID) {
      setIsResolvingTenantSession(false)
      if (!redirectAfterLogin()) {
        navigate(ROUTES.user.dashboard, { replace: true })
      }
      return
    }

    const storedTenantSession = pruneExpiredUserConsoleSessions().find(
      (session) => Number(session.tenant_id || 0) === targetTenantID,
    )

    if (!storedTenantSession) {
      setIsResolvingTenantSession(false)
      return
    }

    if (attemptedSessionKeysRef.current.has(storedTenantSession.key)) {
      setIsResolvingTenantSession(false)
      return
    }

    if (inFlightSessionKeyRef.current === storedTenantSession.key) {
      return
    }

    let cancelled = false
    attemptedSessionKeysRef.current.add(storedTenantSession.key)
    inFlightSessionKeyRef.current = storedTenantSession.key
    setIsResolvingTenantSession(true)

    login(storedTenantSession.token)
      .then(() => {
        if (cancelled) {
          return
        }

        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard, { replace: true })
        }
      })
      .catch(() => {
        if (!cancelled) {
          removeUserConsoleSessionByKey(storedTenantSession.key)
          setIsResolvingTenantSession(false)
        }
      })
      .finally(() => {
        if (!cancelled && inFlightSessionKeyRef.current === storedTenantSession.key) {
          inFlightSessionKeyRef.current = null
        }
      })

    return () => {
      cancelled = true
      if (inFlightSessionKeyRef.current === storedTenantSession.key) {
        inFlightSessionKeyRef.current = null
      }
    }
  }, [isAuthenticated, isAuthLoading, login, navigate, redirectAfterLogin, tenantInfo])

  return {
    isResolvingTenantSession,
  }
}
