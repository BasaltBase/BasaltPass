import { Route } from 'react-router-dom'
import TenantAutomationTokens from '@pages/tenant/security/AutomationTokens'
import TenantUserManagement from '@pages/tenant/user/UserManagement'
import TenantRoleManagement from '@pages/tenant/user/RoleManagement'
import TenantPermissionManagement from '@pages/tenant/permission/TenantPermissionManagement'
import TenantWalletManagement from '@pages/tenant/wallet/WalletManagement'
import GiftCardManagement from '@pages/tenant/wallet/GiftCardManagement'
import { withTenant } from '@/routes/helpers'

export function TenantAccessRoutes() {
  return (
    <>
      <Route path="/tenant/automation-tokens" element={withTenant(<TenantAutomationTokens />)} />
      <Route path="/tenant/users" element={withTenant(<TenantUserManagement />)} />
      <Route path="/tenant/roles" element={withTenant(<TenantRoleManagement />)} />
      <Route path="/tenant/permissions" element={withTenant(<TenantPermissionManagement />)} />
      <Route path="/tenant/wallets" element={withTenant(<TenantWalletManagement />)} />
      <Route path="/tenant/gift-cards" element={withTenant(<GiftCardManagement />)} />
    </>
  )
}
