import { AdminAccessRoutes } from '@/routes/admin/accessRoutes'
import { AdminAppRoutes } from '@/routes/admin/appRoutes'
import { AdminBillingRoutes } from '@/routes/admin/billingRoutes'
import { AdminCoreRoutes } from '@/routes/admin/coreRoutes'
import { AdminSettingsRoutes } from '@/routes/admin/settingsRoutes'
import { AdminTenantRoutes } from '@/routes/admin/tenantRoutes'

export function AdminRoutes() {
  return (
    <>
      <AdminCoreRoutes />
      <AdminAppRoutes />
      <AdminAccessRoutes />
      <AdminTenantRoutes />
      <AdminBillingRoutes />
      <AdminSettingsRoutes />
    </>
  )
}
