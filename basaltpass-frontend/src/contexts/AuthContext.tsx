import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAccessToken, clearAccessToken, setAccessToken } from '../utils/auth'
import { debugAuth } from '../utils/debug'
import client from '../api/client'
import { decodeJWT } from '../utils/jwt'

interface User {
  id: number
  email: string
  phone?: string
  nickname?: string
  avatar_url?: string

  // capability flags (from backend profile)
  is_super_admin?: boolean
  has_tenant?: boolean
  tenant_id?: number
  tenant_role?: string
}

interface UserTenant {
  id: number
  name?: string
  role?: string
  status?: string
}

interface AuthContextType {
  user: User | null
  tenants: UserTenant[]
  canAccessAdmin: boolean
  canAccessTenant: boolean
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [tenants, setTenants] = useState<UserTenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasChecked, setHasChecked] = useState(false)
  const navigate = useNavigate()

  const expectedScope = (import.meta as any).env?.VITE_AUTH_SCOPE || 'user'

  const tokenMatchesScope = useCallback((token: string) => {
    const decoded = decodeJWT(token)
    const tokenScope: string = decoded?.scp || 'user'
    return tokenScope === expectedScope
  }, [expectedScope])

  const tryRefresh = useCallback(async () => {
    try {
      const res = await client.post('/api/v1/auth/refresh')
      const accessToken = res.data?.access_token
      if (typeof accessToken === 'string' && accessToken.length > 0) {
        setAccessToken(accessToken)
        return accessToken as string
      }
    } catch (e) {
      // ignore
    }
    return null
  }, [])

  const checkAuth = useCallback(async () => {
    debugAuth.log('Starting auth check')
    let token = getAccessToken()
    
    if (!token) {
      debugAuth.log('No token found, attempting refresh')
      token = await tryRefresh()
    }

    if (!token) {
      debugAuth.log('No token found, setting unauthenticated')
      setUser(null)
      setTenants([])
      setIsLoading(false)
      setHasChecked(true)
      return
    }

    if (!tokenMatchesScope(token)) {
      debugAuth.log('Token scope mismatch, clearing token')
      clearAccessToken()
      setUser(null)
      setTenants([])
      setIsLoading(false)
      setHasChecked(true)
      return
    }

    try {
      debugAuth.log('Token found, checking validity')
      const response = await client.get('/api/v1/user/profile')
      debugAuth.log('API Response received:', response.data)
      
      // 检查响应结构
      if (response.data && response.data.data) {
        debugAuth.log('Token valid, setting user', response.data.data)
        setUser(response.data.data)
      } else if (response.data && !response.data.data) {
        // 如果响应结构不同，直接使用response.data
        debugAuth.log('Token valid, setting user (direct)', response.data)
        setUser(response.data)
      } else {
        debugAuth.log('Invalid response structure', response)
        throw new Error('Invalid response structure')
      }

    // Load tenant associations (best-effort)
    try {
    const tenantsRes = await client.get('/api/v1/user/tenants')
    setTenants(tenantsRes.data?.data || [])
    } catch (e) {
    setTenants([])
    }
    } catch (error: any) {
      debugAuth.log('Token validation failed', error.response?.status)
      if (error.response?.status === 401) {
        debugAuth.log('Clearing invalid token')
        clearAccessToken()
        setUser(null)
		setTenants([])
      } else {
        // 对于其他错误（如网络错误、服务器错误等），保持当前状态
        // 不要立即设置为未认证，因为这可能是临时错误
        debugAuth.log('Other error, keeping current state')
        // 对于非401错误，我们暂时保持用户状态，不立即清除
        // 这样可以避免因为临时网络问题导致的认证失效
      }
    } finally {
      setIsLoading(false)
      setHasChecked(true)
      debugAuth.log('Auth check completed')
    }
  }, [])

  const login = useCallback(async (token: string) => {
    debugAuth.log('Login called with token', token.substring(0, 20) + '...')
    if (!tokenMatchesScope(token)) {
      throw new Error('Token scope mismatch')
    }
    setAccessToken(token)
    setIsLoading(true)
    try {
      const response = await client.get('/api/v1/user/profile')
      const profileData = response.data?.data ?? response.data

      if (!profileData || typeof profileData !== 'object') {
        throw new Error('Invalid user profile response')
      }

      debugAuth.log('Login completed, user set', profileData)
      setUser(profileData)

    // Load tenant associations (best-effort)
    try {
    const tenantsRes = await client.get('/api/v1/user/tenants')
    setTenants(tenantsRes.data?.data || [])
    } catch (e) {
    setTenants([])
    }
    } catch (error) {
      debugAuth.log('Failed to fetch profile after login', error)
      clearAccessToken()
      setUser(null)
	  setTenants([])
      throw error
    } finally {
      setIsLoading(false)
      setHasChecked(true)
    }
  }, [])

  const logout = useCallback(() => {
    debugAuth.log('Logout called')
    clearAccessToken()
    setUser(null)
    setTenants([])
    setIsLoading(false)
    setHasChecked(true)
    navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    if (!hasChecked) {
      checkAuth()
    }
  }, [hasChecked]) // 移除 checkAuth 依赖项，避免无限循环

  // 调试：输出当前状态
  useEffect(() => {
    debugAuth.logState({ user, isAuthenticated: !!user, isLoading, hasChecked })
  }, [user, isLoading, hasChecked])

  const value: AuthContextType = {
    user,
    tenants,
    canAccessAdmin: !!user?.is_super_admin,
    canAccessTenant: !!user?.has_tenant || tenants.length > 0,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
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