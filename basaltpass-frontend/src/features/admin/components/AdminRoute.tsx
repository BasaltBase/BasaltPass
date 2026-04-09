import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { useI18n } from '@shared/i18n/useI18n'
import PSkeleton from '@ui/PSkeleton'
import { setSessionNotice } from '@utils/sessionNotice'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading, canAccessAdmin } = useAuth()
  const navigate = useNavigate()
  const { t } = useI18n()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      setSessionNotice('session_expired')
      navigate('/', { replace: true })
      return
    }

    if (!canAccessAdmin) {
      setSessionNotice('admin_access_required')
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, isLoading, canAccessAdmin, navigate])

  if (isLoading) {
    return <PSkeleton.PageLoader message={t('adminRoute.verifyingAdminAccess')} />
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return null
  }

  return <>{children}</>
}
