import { Navigate } from 'react-router-dom'
import { useConfig } from '@contexts/ConfigContext'
import PSkeleton from '@ui/PSkeleton'

interface MarketProtectedRouteProps {
  children: React.ReactNode
}

const MarketProtectedRoute: React.FC<MarketProtectedRouteProps> = ({ children }) => {
  const { marketEnabled, loading } = useConfig()

  // 如果配置还在加载中，显示加载状态
  if (loading) {
    return <PSkeleton.PageLoader />
  }

  // 如果市场功能未启用，重定向到仪表板
  if (!marketEnabled) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default MarketProtectedRoute
