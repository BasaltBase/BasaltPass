import { Navigate } from 'react-router-dom'
import { useConfig } from '@contexts/ConfigContext'
import PSkeleton from '@ui/PSkeleton'

interface MarketProtectedRouteProps {
  children: React.ReactNode
}

const MarketProtectedRoute: React.FC<MarketProtectedRouteProps> = ({ children }) => {
  const { marketEnabled, loading } = useConfig()

  // translatedconfigtranslatedloading，translatedstatus
  if (loading) {
    return <PSkeleton.PageLoader />
  }

  // translatedmarkettranslatednotenabled，translatedtotranslated
  if (!marketEnabled) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default MarketProtectedRoute
