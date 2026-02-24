import { Routes, Route, Navigate } from 'react-router-dom'
import TenantRoute from '../../../src/features/tenant/components/TenantRoute'

import TenantDashboard from '../../../src/features/tenant/Dashboard'
import TenantInfo from '../../../src/features/tenant/TenantInfo'
import TenantApps from '../../../src/features/tenant/app/Apps'
import CreateApp from '../../../src/features/tenant/app/CreateApp'
import AppDetail from '../../../src/features/tenant/app/AppDetail'
import AppSettings from '../../../src/features/tenant/app/AppSettings'
import AppStats from '../../../src/features/tenant/app/AppStats'
import TenantOAuthClients from '../../../src/features/tenant/app/OAuthClients'
import TenantUserManagement from '../../../src/features/tenant/user/UserManagement'
import TenantTeamsPage from '../../../src/features/tenant/team/Teams'
import TenantRoleManagement from '../../../src/features/tenant/user/RoleManagement'
import TenantPermissionManagement from '../../../src/features/tenant/permission/TenantPermissionManagement'
import TenantNotifications from '../../../src/features/tenant/notification/Notifications'
import AppUserManagement from '../../../src/features/tenant/app/AppUserManagement'
import AppRoleManagement from '../../../src/features/tenant/app/AppRoleManagement'
import AppPermissionManagement from '../../../src/features/tenant/app/AppPermissionManagement'

import TenantSubscriptionDashboard from '../../../src/features/tenant/subscription/Dashboard'
import TenantProducts from '../../../src/features/tenant/subscription/Products'
import TenantSubscriptions from '../../../src/features/tenant/subscription/Subscriptions'
import TenantSubscriptionDetail from '../../../src/features/tenant/subscription/SubscriptionDetail'
import TenantPlans from '../../../src/features/tenant/subscription/Plans'
import TenantPrices from '../../../src/features/tenant/subscription/Prices'
import TenantCoupons from '../../../src/features/tenant/subscription/Coupons'
import TenantInvoices from '../../../src/features/tenant/subscription/Invoices'
import SubscriptionStatusManagement from '../../../src/features/tenant/subscription/SubscriptionStatusManagement'
import CouponManagement from '../../../src/features/tenant/subscription/CouponManagement'
import PlanManagement from '../../../src/features/tenant/subscription/PlanManagement'
import PriceManagement from '../../../src/features/tenant/subscription/PriceManagement'

import NotFound from '../../../src/features/NotFound'

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
        <h1 className="text-lg font-semibold text-gray-900">租户控制台</h1>
        <p className="mt-2 text-sm text-gray-600">
          请从用户控制台点击“租户管理”进入（按需授权）。
        </p>
        <a
          className="mt-4 inline-block text-purple-600 hover:underline"
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
      <Route path="/tenant" element={<Navigate to="/tenant/dashboard" replace />} />

      <Route path="/tenant/dashboard" element={<TenantRoute><TenantDashboard /></TenantRoute>} />
      <Route path="/tenant/info" element={<TenantRoute><TenantInfo /></TenantRoute>} />
      <Route path="/tenant/apps" element={<TenantRoute><TenantApps /></TenantRoute>} />
      <Route path="/tenant/apps/new" element={<TenantRoute><CreateApp /></TenantRoute>} />
      <Route path="/tenant/apps/:id" element={<TenantRoute><AppDetail /></TenantRoute>} />
      <Route path="/tenant/apps/:id/settings" element={<TenantRoute><AppSettings /></TenantRoute>} />
      <Route path="/tenant/apps/:id/stats" element={<TenantRoute><AppStats /></TenantRoute>} />
      <Route path="/tenant/apps/:id/users" element={<TenantRoute><AppUserManagement /></TenantRoute>} />
      <Route path="/tenant/apps/:id/roles" element={<TenantRoute><AppRoleManagement /></TenantRoute>} />
      <Route path="/tenant/apps/:id/permissions" element={<TenantRoute><AppPermissionManagement /></TenantRoute>} />
      <Route path="/tenant/oauth/clients" element={<TenantRoute><TenantOAuthClients /></TenantRoute>} />

      <Route path="/tenant/users" element={<TenantRoute><TenantUserManagement /></TenantRoute>} />
      <Route path="/tenant/teams" element={<TenantRoute><TenantTeamsPage /></TenantRoute>} />
      <Route path="/tenant/roles" element={<TenantRoute><TenantRoleManagement /></TenantRoute>} />
      <Route path="/tenant/permissions" element={<TenantRoute><TenantPermissionManagement /></TenantRoute>} />
      <Route path="/tenant/notifications" element={<TenantRoute><TenantNotifications /></TenantRoute>} />

      <Route path="/tenant/subscriptions" element={<TenantRoute><TenantSubscriptionDashboard /></TenantRoute>} />
      <Route path="/tenant/subscriptions/products" element={<TenantRoute><TenantProducts /></TenantRoute>} />
      <Route path="/tenant/subscriptions/subscriptions" element={<TenantRoute><TenantSubscriptions /></TenantRoute>} />
      <Route path="/tenant/subscriptions/subscriptions/:id" element={<TenantRoute><TenantSubscriptionDetail /></TenantRoute>} />
      <Route path="/tenant/plans" element={<TenantRoute><TenantPlans /></TenantRoute>} />
      <Route path="/tenant/prices" element={<TenantRoute><TenantPrices /></TenantRoute>} />
      <Route path="/tenant/coupons" element={<TenantRoute><TenantCoupons /></TenantRoute>} />
      <Route path="/tenant/invoices" element={<TenantRoute><TenantInvoices /></TenantRoute>} />

      <Route path="/tenant/subscription-status" element={<TenantRoute><SubscriptionStatusManagement /></TenantRoute>} />
      <Route path="/tenant/subscriptions/coupons/manage" element={<TenantRoute><CouponManagement /></TenantRoute>} />
      <Route path="/tenant/subscriptions/plans/manage" element={<TenantRoute><PlanManagement /></TenantRoute>} />
      <Route path="/tenant/subscriptions/prices/manage" element={<TenantRoute><PriceManagement /></TenantRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
