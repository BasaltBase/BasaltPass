import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { ROUTES } from '@constants'
import PSkeleton from '@ui/PSkeleton'

interface TenantRouteProps {
  children: React.ReactNode
}

export default function TenantRoute({ children }: TenantRouteProps) {
  const { isAuthenticated, isLoading, canAccessTenant } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      navigate(ROUTES.user.login, { replace: true })
      return
    }

    if (!canAccessTenant) {
      navigate(ROUTES.user.dashboard, { replace: true })
    }
  }, [isAuthenticated, isLoading, canAccessTenant, navigate])

  if (isLoading) {
    return <PSkeleton.PageLoader message="正在验证租户权限..." />
  }

  if (!isAuthenticated || !canAccessTenant) {
    return null
  }

  return <>{children}</>
}
