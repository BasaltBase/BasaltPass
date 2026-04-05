import type { ReactElement } from 'react'
import ProtectedRoute from '@routes/ProtectedRoute'
import AdminRoute from '@features/admin/components/AdminRoute'
import TenantRoute from '@features/tenant/components/TenantRoute'
import MarketFeatureRoute from '@/shared/components/MarketFeatureRoute'

export function withProtected(element: ReactElement) {
  return <ProtectedRoute>{element}</ProtectedRoute>
}

export function withAdmin(element: ReactElement) {
  return <AdminRoute>{element}</AdminRoute>
}

export function withTenant(element: ReactElement) {
  return <TenantRoute>{element}</TenantRoute>
}

export function withProtectedMarket(element: ReactElement) {
  return withProtected(<MarketFeatureRoute>{element}</MarketFeatureRoute>)
}

export function withAdminMarket(element: ReactElement) {
  return withAdmin(<MarketFeatureRoute>{element}</MarketFeatureRoute>)
}

export function withTenantMarket(element: ReactElement) {
  return withTenant(<MarketFeatureRoute>{element}</MarketFeatureRoute>)
}
