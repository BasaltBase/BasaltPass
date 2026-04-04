import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import PSkeleton from '@ui/PSkeleton'
import { setSessionNotice } from '@utils/sessionNotice'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading, canAccessAdmin } = useAuth()
  const navigate = useNavigate()

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
    return <PSkeleton.PageLoader message="正在验证管理员权限..." />
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return null
  }

  return <>{children}</>
}
