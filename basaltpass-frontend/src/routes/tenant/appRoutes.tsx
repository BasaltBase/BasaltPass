import { Route } from 'react-router-dom'
import TenantApps from '@pages/tenant/app/Apps'
import AppDetail from '@pages/tenant/app/AppDetail'
import AppSettings from '@pages/tenant/app/AppSettings'
import AppStats from '@pages/tenant/app/AppStats'
import TenantOAuthClients from '@pages/tenant/app/OAuthClients'
import AppUserManagement from '@pages/tenant/app/AppUserManagement'
import AppRoleManagement from '@pages/tenant/app/AppRoleManagement'
import AppPermissionManagement from '@pages/tenant/app/AppPermissionManagement'
import CreateApp from '@pages/admin/app/CreateApp'
import { withTenant } from '@/routes/helpers'

export function TenantAppRoutes() {
  return (
    <>
      <Route path="/tenant/apps" element={withTenant(<TenantApps />)} />
      <Route path="/tenant/apps/new" element={withTenant(<CreateApp />)} />
      <Route path="/tenant/apps/:id/settings" element={withTenant(<AppSettings />)} />
      <Route path="/tenant/apps/:id/stats" element={withTenant(<AppStats />)} />
      <Route path="/tenant/apps/:id/users" element={withTenant(<AppUserManagement />)} />
      <Route path="/tenant/apps/:id/roles" element={withTenant(<AppRoleManagement />)} />
      <Route path="/tenant/apps/:id/permissions" element={withTenant(<AppPermissionManagement />)} />
      <Route path="/tenant/apps/:id" element={withTenant(<AppDetail />)} />
      <Route path="/tenant/oauth/clients" element={withTenant(<TenantOAuthClients />)} />
    </>
  )
}
