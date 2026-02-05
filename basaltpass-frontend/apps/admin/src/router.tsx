import { Routes, Route, Navigate } from 'react-router-dom'
import AdminRoute from '../../../src/components/AdminRoute'

import AdminDashboard from '../../../src/pages/admin/Dashboard'
import Users from '../../../src/pages/admin/user/Users'
import UserDetail from '../../../src/pages/admin/user/UserDetail'
import Roles from '../../../src/pages/admin/user/Roles'
import WalletsAdmin from '../../../src/pages/admin/user/Wallets'
import WalletManagement from '../../../src/pages/admin/wallet/WalletManagement'
import Logs from '../../../src/pages/admin/Logs'

import OAuthClients from '../../../src/pages/admin/oauth/OAuthClients'
import OAuthClientConfig from '../../../src/pages/admin/oauth/OAuthClientConfig'

import AdminSubscriptions from '../../../src/pages/admin/subscription/Subscriptions'
import AdminProducts from '../../../src/pages/admin/subscription/Products'
import AdminPlans from '../../../src/pages/admin/subscription/Plans'
import AdminPrices from '../../../src/pages/admin/subscription/Prices'
import AdminCoupons from '../../../src/pages/admin/subscription/Coupons'

import AdminPermissions from '../../../src/pages/admin/rbac/Permissions'
import AdminSettingsPage from '../../../src/pages/admin/settings/Index'
import SettingsCategoryPage from '../../../src/pages/admin/settings/SettingsCategoryPage'

import TenantList from '../../../src/pages/admin/tenant/TenantList'
import CreateTenant from '../../../src/pages/admin/tenant/CreateTenant'
import TenantDetail from '../../../src/pages/admin/tenant/TenantDetail'
import EditTenant from '../../../src/pages/admin/tenant/EditTenant'
import TenantUsers from '../../../src/pages/admin/tenant/TenantUsers'

import AppList from '../../../src/pages/admin/app/AppList'
import CreateApp from '../../../src/pages/admin/app/CreateApp'

import AdminNotifications from '../../../src/pages/admin/notification/Notifications'
import AdminTeamsPage from '../../../src/pages/admin/team/Teams'
import AdminInvitationsPage from '../../../src/pages/admin/invitation/Invitations'

import EmailTest from '../../../src/pages/admin/email/EmailTest'

import NotFound from '../../../src/pages/NotFound'

function Entry() {
  const userUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || ''
  const joinUrl = (base: string, path: string) => {
    const b = (base || '').replace(/\/+$/, '')
    const p = (path || '').replace(/^\//, '')
    if (!b) return '/' + p
    return `${b}/${p}`
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-lg font-semibold text-gray-900">管理员控制台</h1>
        <p className="mt-2 text-sm text-gray-600">
          请从用户/租户控制台点击“管理员面板”进入（按需授权）。
        </p>
        <a
          className="mt-4 inline-block text-indigo-600 hover:underline"
          href={joinUrl(userUrl, 'dashboard')}
        >
          返回用户控制台
        </a>
      </div>
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

      <Route path="/admin/users" element={<AdminRoute><Users /></AdminRoute>} />
      <Route path="/admin/users/:id" element={<AdminRoute><UserDetail /></AdminRoute>} />
      <Route path="/admin/roles" element={<AdminRoute><Roles /></AdminRoute>} />

      <Route path="/admin/wallets" element={<AdminRoute><WalletsAdmin /></AdminRoute>} />
      <Route path="/admin/wallet-management" element={<AdminRoute><WalletManagement /></AdminRoute>} />
      <Route path="/admin/logs" element={<AdminRoute><Logs /></AdminRoute>} />

      <Route path="/admin/oauth/clients" element={<AdminRoute><OAuthClients /></AdminRoute>} />
      <Route path="/admin/oauth/clients/:clientId" element={<AdminRoute><OAuthClientConfig /></AdminRoute>} />

      <Route path="/admin/subscriptions" element={<AdminRoute><AdminSubscriptions /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
      <Route path="/admin/plans" element={<AdminRoute><AdminPlans /></AdminRoute>} />
      <Route path="/admin/prices" element={<AdminRoute><AdminPrices /></AdminRoute>} />
      <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />

      <Route path="/admin/permissions" element={<AdminRoute><AdminPermissions /></AdminRoute>} />
      <Route path="/admin/settings/:category" element={<AdminRoute><SettingsCategoryPage /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage /></AdminRoute>} />

      <Route path="/admin/tenants" element={<AdminRoute><TenantList /></AdminRoute>} />
      <Route path="/admin/tenants/create" element={<AdminRoute><CreateTenant /></AdminRoute>} />
      <Route path="/admin/tenants/:id" element={<AdminRoute><TenantDetail /></AdminRoute>} />
      <Route path="/admin/tenants/:id/edit" element={<AdminRoute><EditTenant /></AdminRoute>} />
      <Route path="/admin/tenants/:id/users" element={<AdminRoute><TenantUsers /></AdminRoute>} />

      <Route path="/admin/apps" element={<AdminRoute><AppList /></AdminRoute>} />
      <Route path="/admin/apps/create" element={<AdminRoute><CreateApp /></AdminRoute>} />

      <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
      <Route path="/admin/teams" element={<AdminRoute><AdminTeamsPage /></AdminRoute>} />
      <Route path="/admin/invitations" element={<AdminRoute><AdminInvitationsPage /></AdminRoute>} />
      
      <Route path="/admin/email/test" element={<AdminRoute><EmailTest /></AdminRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
