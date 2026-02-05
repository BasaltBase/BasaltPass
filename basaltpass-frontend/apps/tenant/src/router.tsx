import { Routes, Route, Navigate } from 'react-router-dom'
import TenantRoute from '../../../src/components/TenantRoute'

import TenantDashboard from '../../../src/pages/tenant/Dashboard'
import TenantInfo from '../../../src/pages/tenant/TenantInfo'
import TenantApps from '../../../src/pages/tenant/app/Apps'
import CreateApp from '../../../src/pages/tenant/app/CreateApp'
import AppDetail from '../../../src/pages/tenant/app/AppDetail'
import AppSettings from '../../../src/pages/tenant/app/AppSettings'
import AppStats from '../../../src/pages/tenant/app/AppStats'
import TenantOAuthClients from '../../../src/pages/tenant/app/OAuthClients'
import TenantUserManagement from '../../../src/pages/tenant/user/UserManagement'
import TenantRoleManagement from '../../../src/pages/tenant/user/RoleManagement'
import TenantNotifications from '../../../src/pages/tenant/notification/Notifications'

import TenantSubscriptionDashboard from '../../../src/pages/tenant/subscription/Dashboard'
import TenantProducts from '../../../src/pages/tenant/subscription/Products'
import TenantSubscriptions from '../../../src/pages/tenant/subscription/Subscriptions'
import TenantSubscriptionDetail from '../../../src/pages/tenant/subscription/SubscriptionDetail'
import TenantPlans from '../../../src/pages/tenant/subscription/Plans'
import TenantPrices from '../../../src/pages/tenant/subscription/Prices'
import TenantCoupons from '../../../src/pages/tenant/subscription/Coupons'
import TenantInvoices from '../../../src/pages/tenant/subscription/Invoices'
import SubscriptionStatusManagement from '../../../src/pages/tenant/subscription/SubscriptionStatusManagement'
import CouponManagement from '../../../src/pages/tenant/subscription/CouponManagement'
import PlanManagement from '../../../src/pages/tenant/subscription/PlanManagement'
import PriceManagement from '../../../src/pages/tenant/subscription/PriceManagement'

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
      <Route path="/tenant/oauth/clients" element={<TenantRoute><TenantOAuthClients /></TenantRoute>} />

      <Route path="/tenant/users" element={<TenantRoute><TenantUserManagement /></TenantRoute>} />
      <Route path="/tenant/roles" element={<TenantRoute><TenantRoleManagement /></TenantRoute>} />
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
