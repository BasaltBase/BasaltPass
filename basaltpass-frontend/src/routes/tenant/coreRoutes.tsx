import { Route } from 'react-router-dom'
import TenantDashboard from '@pages/tenant/Dashboard'
import TenantInfo from '@pages/tenant/TenantInfo'
import TenantNotifications from '@pages/tenant/notification/Notifications'
import TenantTeamsPage from '@pages/tenant/team/Teams'
import { withTenant } from '@/routes/helpers'

export function TenantCoreRoutes() {
  return (
    <>
      <Route path="/tenant/dashboard" element={withTenant(<TenantDashboard />)} />
      <Route path="/tenant/info" element={withTenant(<TenantInfo />)} />
      <Route path="/tenant/notifications" element={withTenant(<TenantNotifications />)} />
      <Route path="/tenant/teams" element={withTenant(<TenantTeamsPage />)} />
    </>
  )
}
