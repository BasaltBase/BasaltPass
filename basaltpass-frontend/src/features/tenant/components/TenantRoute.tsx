import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import PSkeleton from '@ui/PSkeleton'
import { setSessionNotice } from '@utils/sessionNotice'
import { useI18n } from '@shared/i18n'

interface TenantRouteProps {
  children: React.ReactNode
}

export default function TenantRoute({ children }: TenantRouteProps) {
  const { isAuthenticated, isLoading, canAccessTenant } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      setSessionNotice('session_expired')
      navigate('/', { replace: true })
      return
    }

    if (!canAccessTenant) {
      setSessionNotice('tenant_access_required')
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, canAccessTenant, navigate])

  if (isLoading) {
    return <PSkeleton.PageLoader message={t('tenantRoute.verifyingAccess')} />
  }

  if (!isAuthenticated || !canAccessTenant) {
    return null
  }

  return <>{children}</>
}
