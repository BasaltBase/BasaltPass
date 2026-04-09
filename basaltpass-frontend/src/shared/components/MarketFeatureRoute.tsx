import { Navigate } from 'react-router-dom';
import { useConfig } from '@contexts/ConfigContext';

interface MarketFeatureRouteProps {
  children: React.ReactNode;
}

/**
 * translatedmarkettranslatedroute
 * translatedmarkettranslateddisabled，translatedtotranslated
 */
export default function MarketFeatureRoute({ children }: MarketFeatureRouteProps) {
  const { marketEnabled } = useConfig();

  // translatedmarkettranslateddisabled，translatedtotranslated
  if (!marketEnabled) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
