import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface TenantRouteProps {
  children: React.ReactNode
}

export default function TenantRoute({ children }: TenantRouteProps) {
  const { isAuthenticated, isLoading, canAccessTenant } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }

    if (!canAccessTenant) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, canAccessTenant, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在验证租户权限...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !canAccessTenant) {
    return null
  }

  return <>{children}</>
}
