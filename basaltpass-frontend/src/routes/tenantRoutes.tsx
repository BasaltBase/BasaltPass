import { TenantAccessRoutes } from '@/routes/tenant/accessRoutes'
import { TenantAppRoutes } from '@/routes/tenant/appRoutes'
import { TenantCoreRoutes } from '@/routes/tenant/coreRoutes'
import { TenantSubscriptionRoutes } from '@/routes/tenant/subscriptionRoutes'

export function TenantRoutes() {
  return (
    <>
      <TenantCoreRoutes />
      <TenantAppRoutes />
      <TenantAccessRoutes />
      <TenantSubscriptionRoutes />
    </>
  )
}
