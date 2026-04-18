import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, clearAccessToken, setAccessToken, getAuthScope } from '../utils/auth'
import { debugAuth } from '../utils/debug'
import client from '../api/client'
import { decodeJWT } from '../utils/jwt'
import { fetchPublicTenantByCode } from '../api/public/tenant'
import {
  getUserConsoleSession,
  listUserConsoleSessions,
  pruneExpiredUserConsoleSessions,
  removeUserConsoleSession,
  type UserConsoleSession,
  upsertUserConsoleSession,
} from '../utils/userSessions'
import { ROUTES } from '@constants'
import { resolveLanguageFromProfile, useI18n } from '@shared/i18n'

interface User {
  id: number
  email: string
  phone?: string
  nickname?: string
  avatar_url?: string
  is_super_admin?: boolean
  has_tenant?: boolean
  tenant_id?: number
  tenant_role?: string
}

interface UserTenant {
  id: number
  name?: string
  code?: string
  role?: string
  metadata?: Record<string, any>
  status?: string
}

interface AuthContextType {
  user: User | null
  tenants: UserTenant[]
  userSessions: UserConsoleSession[]
  canAccessAdmin: boolean
  canAccessTenant: boolean
  canUseWallet: boolean
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  switchAccount: (sessionKey: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const expectedScope = getAuthScope()
  const { setLanguage } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [tenants, setTenants] = useState<UserTenant[]>([])
  const [userSessions, setUserSessions] = useState<UserConsoleSession[]>(() =>
    expectedScope === 'user' ? listUserConsoleSessions() : [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [hasChecked, setHasChecked] = useState(false)
  const tenantHintHandledRef = useRef('')
  const tenantHintSwitchingRef = useRef(false)
  const navigate = useNavigate()

  const tokenMatchesScope = useCallback((token: string) => {
    const decoded = decodeJWT(token)
    const tokenScope: string = decoded?.scp || 'user'
    return tokenScope === expectedScope
  }, [expectedScope])

  const syncUserSessions = useCallback(() => {
    if (expectedScope !== 'user') {
      setUserSessions([])
      return
    }
    setUserSessions(listUserConsoleSessions())
  }, [expectedScope])

  const syncLanguageFromProfile = useCallback(async (profileData: any) => {
    const directLanguage = resolveLanguageFromProfile(profileData)
    if (directLanguage) {
      setLanguage(directLanguage)
      return
    }

    try {
      const profileDetailRes = await client.get('/api/v1/user/profile-detail')
      const detailProfile =
        profileDetailRes.data?.profile ??
        profileDetailRes.data?.data?.profile ??
        profileDetailRes.data?.data ??
        profileDetailRes.data
      const detailLanguage = resolveLanguageFromProfile(detailProfile)
      if (detailLanguage) {
        setLanguage(detailLanguage)
        return
      }

      const languageId = Number(detailProfile?.language_id)
      if (Number.isFinite(languageId)) {
        const languagesRes = await client.get('/api/v1/user/languages')
        const languageList = languagesRes.data?.languages ?? languagesRes.data?.data ?? []
        const matchedLanguage = Array.isArray(languageList)
          ? languageList.find((item: any) => Number(item?.id ?? item?.ID) === languageId)
          : undefined
        const mappedLanguage = resolveLanguageFromProfile({ language: matchedLanguage })
        if (mappedLanguage) {
          setLanguage(mappedLanguage)
        }
      }
    } catch {
      // Keep current language if profile detail is unavailable.
    }
  }, [setLanguage])

  const loadIdentity = useCallback(async (token: string) => {
    if (!tokenMatchesScope(token)) {
      throw new Error('Token scope mismatch')
    }

    setAccessToken(token)

    const response = await client.get('/api/v1/user/profile')
    const profileData = response.data?.data ?? response.data
    if (!profileData || typeof profileData !== 'object') {
      throw new Error('Invalid user profile response')
    }

    let tenantList: UserTenant[] = []
    try {
      const tenantsRes = await client.get('/api/v1/user/tenants')
      tenantList = tenantsRes.data?.data || []
    } catch {
      tenantList = []
    }

    setUser(profileData)
    setTenants(tenantList)
    await syncLanguageFromProfile(profileData)

    if (expectedScope === 'user') {
      upsertUserConsoleSession(profileData, token, tenantList)
      syncUserSessions()
    }

    return { profileData, tenantList }
  }, [expectedScope, syncLanguageFromProfile, syncUserSessions, tokenMatchesScope])

  const checkAuth = useCallback(async () => {
    debugAuth.log('Starting auth check')
    const token = getAccessToken()

    if (!token) {
      debugAuth.log('No token found, setting unauthenticated immediately')
      setUser(null)
      setTenants([])
      setIsLoading(false)
      setHasChecked(true)
      syncUserSessions()
      return
    }

    if (!tokenMatchesScope(token)) {
      debugAuth.log('Token scope mismatch, clearing token')
      clearAccessToken()
      setUser(null)
      setTenants([])
      setIsLoading(false)
      setHasChecked(true)
      syncUserSessions()
      return
    }

    try {
      debugAuth.log('Token found, checking validity')
      const { profileData } = await loadIdentity(token)
      debugAuth.log('Token valid, setting user', profileData)
    } catch (error: any) {
      debugAuth.log('Token validation failed', error.response?.status)
      if (error.response?.status === 401) {
        debugAuth.log('Clearing invalid token')
        clearAccessToken()
        setUser(null)
        setTenants([])
      } else {
        debugAuth.log('Other error, keeping current state')
      }
    } finally {
      setIsLoading(false)
      setHasChecked(true)
      syncUserSessions()
      debugAuth.log('Auth check completed')
    }
  }, [loadIdentity, syncUserSessions, tokenMatchesScope])

  const login = useCallback(async (token: string) => {
    debugAuth.log('Login called with token', token.substring(0, 20) + '...')
    setIsLoading(true)
    try {
      const { profileData } = await loadIdentity(token)
      debugAuth.log('Login completed, user set', profileData)
    } catch (error) {
      debugAuth.log('Failed to fetch profile after login', error)
      clearAccessToken()
      setUser(null)
      setTenants([])
      syncUserSessions()
      throw error
    } finally {
      setIsLoading(false)
      setHasChecked(true)
    }
  }, [loadIdentity, syncUserSessions])

  const switchAccount = useCallback(async (sessionKey: string) => {
    const session = getUserConsoleSession(sessionKey)
    if (!session) {
      throw new Error('translatedsessiontranslatedoralreadytranslated')
    }

    const previousToken = getAccessToken()
    setIsLoading(true)
    try {
      await loadIdentity(session.token)
      setHasChecked(true)
      navigate(ROUTES.user.dashboard, { replace: true })
    } catch (error) {
      if (previousToken) {
        setAccessToken(previousToken)
      } else {
        clearAccessToken()
      }
      removeUserConsoleSession(session.user_id, session.tenant_id)
      syncUserSessions()
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [loadIdentity, navigate, syncUserSessions])

  const logout = useCallback(() => {
    debugAuth.log('Logout called')
    if (expectedScope === 'user' && user?.id) {
      removeUserConsoleSession(user.id, Number(user.tenant_id || 0))
      syncUserSessions()
    }
    clearAccessToken()
    setUser(null)
    setTenants([])
    setIsLoading(false)
    setHasChecked(true)
    navigate('/login', { replace: true })
  }, [expectedScope, navigate, syncUserSessions, user?.id, user?.tenant_id])

  useEffect(() => {
    if (!hasChecked) {
      checkAuth()
    }
  }, [checkAuth, hasChecked])

  useEffect(() => {
    if (expectedScope !== 'user') {
      return
    }
    if (!hasChecked || isLoading || !user || tenantHintSwitchingRef.current) {
      return
    }
    if (typeof window === 'undefined') {
      return
    }

    const query = new URLSearchParams(window.location.search || '')
    const tenantCode = (query.get('tenant') || query.get('tenant_code') || '').trim()
    if (!tenantCode) {
      return
    }
    if (tenantHintHandledRef.current === tenantCode) {
      return
    }

    const applyTenantCodeHint = async () => {
      tenantHintHandledRef.current = tenantCode

      try {
        const tenantInfo = await fetchPublicTenantByCode(tenantCode)
        const targetTenantID = Number(tenantInfo?.id || 0)
        if (!targetTenantID) {
          return
        }

        if (Number(user.tenant_id || 0) === targetTenantID) {
          return
        }

        const targetSession = pruneExpiredUserConsoleSessions().find((session) => Number(session.tenant_id) === targetTenantID)
        if (!targetSession || !tokenMatchesScope(targetSession.token)) {
          return
        }

        tenantHintSwitchingRef.current = true
        setIsLoading(true)
        await loadIdentity(targetSession.token)
        setHasChecked(true)
      } catch {
      } finally {
        tenantHintSwitchingRef.current = false
        setIsLoading(false)
      }
    }

    void applyTenantCodeHint()
  }, [expectedScope, hasChecked, isLoading, loadIdentity, tokenMatchesScope, user])

  useEffect(() => {
    debugAuth.logState({ user, isAuthenticated: !!user, isLoading, hasChecked })
  }, [user, isLoading, hasChecked])

  const tenantRole = (user?.tenant_role || '').toLowerCase()
  const canManageCurrentTenant = user?.tenant_id ? user.tenant_id > 0 && ['owner', 'admin'].includes(tenantRole) : false
  const canManageAnyTenant = tenants.some((tenant) => {
    const roleFromMetadata = String(tenant?.metadata?.user_role || '').toLowerCase()
    const role = roleFromMetadata || String(tenant?.role || '').toLowerCase()
    return Number(tenant?.id || 0) > 0 && ['owner', 'admin'].includes(role)
  })
  const canManageTenant = canManageCurrentTenant || canManageAnyTenant
  const canUseWallet = !!user && (Boolean(user.has_tenant) || Number(user.tenant_id || 0) > 0 || tenants.length > 0)

  const value: AuthContextType = {
    user,
    tenants,
    userSessions,
    canAccessAdmin: !!user?.is_super_admin,
    canAccessTenant: canManageTenant,
    canUseWallet,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
    switchAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
