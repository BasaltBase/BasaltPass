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
  const { marketEnabled } = useConfig();

  // 如果市场功能被禁用，重定向到首页
  if (!marketEnabled) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
