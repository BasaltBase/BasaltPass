import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { ROUTES } from '@constants'

interface AdminRouteProps {
  children: React.ReactNode
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isLoading, canAccessAdmin } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      navigate(ROUTES.user.login, { replace: true })
      return
    }

    if (!canAccessAdmin) {
      navigate(ROUTES.user.dashboard, { replace: true })
    }
  }, [isAuthenticated, isLoading, canAccessAdmin, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证管理员权限...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !canAccessAdmin) {
    return null
  }

  return <>{children}</>
}
