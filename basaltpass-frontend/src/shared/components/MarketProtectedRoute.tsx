import { Navigate } from 'react-router-dom'
import { useConfig } from '@contexts/ConfigContext'

interface MarketProtectedRouteProps {
  children: React.ReactNode
}

const MarketProtectedRoute: React.FC<MarketProtectedRouteProps> = ({ children }) => {
  const { marketEnabled, loading } = useConfig()

  // 如果配置还在加载中，显示加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  // 如果市场功能未启用，重定向到仪表板
  if (!marketEnabled) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default MarketProtectedRoute
