import { Navigate } from 'react-router-dom';
import { useConfig } from '@contexts/ConfigContext';

interface MarketFeatureRouteProps {
  children: React.ReactNode;
}

/**
 * 保护需要市场功能的路由
 * 如果市场功能被禁用，则重定向到首页
 */
export default function MarketFeatureRoute({ children }: MarketFeatureRouteProps) {
  const { config } = useConfig();

  // 如果配置还在加载中，显示加载状态
  if (config === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // 如果市场功能被禁用，重定向到首页
  if (!config.marketEnabled) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
