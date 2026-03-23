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
    // 只有在加载完成且未认证时才跳转
    if (!isLoading && !isAuthenticated) {
      debugAuth.logRedirect(window.location.pathname, '/login', 'not authenticated')
      navigate('/login', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  // 如果正在加载，显示加载状态
  if (isLoading) {
    debugAuth.log('ProtectedRoute: showing loading state')
    return <PSkeleton.PageLoader message="正在验证身份..." />
  }

  // 如果已认证，显示子组件
  if (isAuthenticated) {
    debugAuth.log('ProtectedRoute: showing protected content')
    return <>{children}</>
  }

  // 如果未认证且不在加载状态，返回null（会触发跳转）
  debugAuth.log('ProtectedRoute: returning null, will redirect')
  return <PSkeleton.PageLoader message="认证失败，正在跳转..." />
} 