import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { debugAuth } from '../utils/debug'

interface PublicRouteProps {
  children: React.ReactNode
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const search = typeof window !== 'undefined' ? window.location.search : ''

  // OAuth hosted login requires a real login page even when localStorage token exists:
  // /api/v1/oauth/authorize cannot read SPA localStorage token and relies on backend cookies.
  const redirectParam = new URLSearchParams(search).get('redirect') || ''
  const isAuthEntryPath =
    pathname === '/login' ||
    pathname === '/register' ||
    (/^\/auth\/tenant\/[^/]+\/login$/.test(pathname)) ||
    (/^\/tenant\/[^/]+\/login$/.test(pathname)) ||
    (/^\/auth\/tenant\/[^/]+\/register$/.test(pathname)) ||
    (/^\/tenant\/[^/]+\/register$/.test(pathname))
  const hasOAuthAuthorizeRedirect = redirectParam.startsWith('/api/v1/oauth/authorize?')
  const allowOAuthReauth = isAuthEntryPath && hasOAuthAuthorizeRedirect

  useEffect(() => {
    // 只有在加载完成且已认证时才跳转
    if (!isLoading && isAuthenticated && !allowOAuthReauth) {
      debugAuth.logRedirect(window.location.pathname, '/dashboard', 'already authenticated')
      navigate('/dashboard', { replace: true })
    } else if (!isLoading && isAuthenticated && allowOAuthReauth) {
      debugAuth.log('PublicRoute: allowing OAuth re-auth page despite authenticated local state')
    }
  }, [allowOAuthReauth, isAuthenticated, isLoading, navigate])

  // 如果正在加载，显示加载状态
  if (isLoading) {
    debugAuth.log('PublicRoute: showing loading state')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证身份...</p>
        </div>
      </div>
    )
  }

  // 如果未认证，显示子组件
  if (!isAuthenticated || allowOAuthReauth) {
    debugAuth.log('PublicRoute: showing public content')
    return <>{children}</>
  }

  // 如果已认证且不在加载状态，返回null（会触发跳转）
  debugAuth.log('PublicRoute: returning null, will redirect')
  return null
} 
