import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { debugAuth } from '../utils/debug'
import PSkeleton from '@ui/PSkeleton'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // translatedhastranslatednottranslated
    if (!isLoading && !isAuthenticated) {
      const params = new URLSearchParams(window.location.search || '')
      const tenantCode = (params.get('tenant') || params.get('tenant_code') || '').trim()

      if (tenantCode) {
        const redirectTarget = `${window.location.pathname}${window.location.search || ''}`
        const tenantLoginPath = `/auth/tenant/${encodeURIComponent(tenantCode)}/login?redirect=${encodeURIComponent(redirectTarget)}`
        debugAuth.logRedirect(window.location.pathname, tenantLoginPath, 'not authenticated with tenant hint')
        navigate(tenantLoginPath, { replace: true })
        return
      }

      debugAuth.logRedirect(window.location.pathname, '/login', 'not authenticated')
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  // translated，translatedstatus
  if (isLoading) {
    debugAuth.log('ProtectedRoute: showing loading state')
    return <PSkeleton.PageLoader message="translated..." />
  }

  // translatedalreadytranslated，translatedcomponent
  if (isAuthenticated) {
    debugAuth.log('ProtectedRoute: showing protected content')
    return <>{children}</>
  }

  // translatednottranslatedstatus，backnull（translated）
  debugAuth.log('ProtectedRoute: returning null, will redirect')
  return <PSkeleton.PageLoader message="translatedfailed，translated..." />
} 