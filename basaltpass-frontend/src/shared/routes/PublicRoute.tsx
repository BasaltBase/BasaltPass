import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { debugAuth } from '../utils/debug'
import PSkeleton from '@ui/PSkeleton'

interface PublicRouteProps {
  children: React.ReactNode
}

export default function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const search = typeof window !== 'undefined' ? window.location.search : ''
  const isTenantScopedAuthPath =
    /^\/auth\/tenant\/[^/]+\/login$/.test(pathname) ||
    /^\/tenant\/[^/]+\/login$/.test(pathname) ||
    /^\/auth\/tenant\/[^/]+\/register$/.test(pathname) ||
    /^\/tenant\/[^/]+\/register$/.test(pathname) ||
    /^\/auth\/tenant\/[^/]+\/join$/.test(pathname) ||
    /^\/tenant\/[^/]+\/join$/.test(pathname)

  // OAuth hosted login requires a real login page even when localStorage token exists:
  // /api/v1/oauth/authorize cannot read SPA localStorage token and relies on backend cookies.
  const redirectParam = new URLSearchParams(search).get('redirect') || ''
  const isAuthEntryPath =
    pathname === '/login' ||
    pathname === '/register' ||
    isTenantScopedAuthPath
  const hasOAuthAuthorizeRedirect = redirectParam.startsWith('/api/v1/oauth/authorize?')
  const allowTenantScopedAuth = isTenantScopedAuthPath
  const allowOAuthReauth = isAuthEntryPath && hasOAuthAuthorizeRedirect
  const allowPublicAccess = allowTenantScopedAuth || allowOAuthReauth

  useEffect(() => {
    // translatedhastranslatedalreadytranslated
    if (!isLoading && isAuthenticated && !allowPublicAccess) {
      debugAuth.logRedirect(window.location.pathname, '/dashboard', 'already authenticated')
      navigate('/dashboard', { replace: true })
    } else if (!isLoading && isAuthenticated && allowPublicAccess) {
      debugAuth.log('PublicRoute: allowing public auth page despite authenticated local state')
    }
  }, [allowPublicAccess, isAuthenticated, isLoading, navigate])

  // translated，translatedstatus
  if (isLoading) {
    debugAuth.log('PublicRoute: showing loading state')
    return <PSkeleton.PageLoader message="translated..." />
  }

  // translatednottranslated，translatedcomponent
  if (!isAuthenticated || allowPublicAccess) {
    debugAuth.log('PublicRoute: showing public content')
    return <>{children}</>
  }

  // translatedalreadytranslatedstatus，backnull（translated）
  debugAuth.log('PublicRoute: returning null, will redirect')
  return null
} 
