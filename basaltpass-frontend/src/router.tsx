import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '@components/ProtectedRoute'
import PublicRoute from '@components/PublicRoute'
import Login from '@pages/auth/Login'
import Register from '@pages/auth/Register'
import Profile from '@pages/user/profile/Index'
import OauthSuccess from '@pages/auth/OauthSuccess'
import Roles from '@pages/admin/user/Roles'
import Users from '@pages/admin/user/Users'
import WalletIndex from '@pages/user/wallet/Index'
import Recharge from '@pages/user/wallet/Recharge'
import Withdraw from '@pages/user/wallet/Withdraw'
import History from '@pages/user/wallet/History'
import WalletsAdmin from '@pages/admin/user/Wallets'
import Logs from '@pages/admin/Logs'
import SecuritySettings from '@pages/user/security/SecuritySettings'
import TwoFA from '@pages/user/security/TwoFA'
import PasskeyManagement from '@pages/user/security/PasskeyManagement'
import Dashboard from '@pages/user/Dashboard'
import Settings from '@pages/user/Settings'
import Help from '@pages/user/Help'
import TeamIndex from '@pages/user/team/Index'
import CreateTeam from '@pages/user/team/Create'
import TeamDetail from '@pages/user/team/Detail'
import TeamMembers from '@pages/user/team/Members'
import EditTeam from '@pages/user/team/Edit'
import Notifications from '@pages/user/Notifications'
import TenantNotifications from '@pages/tenant/Notifications'
import AdminNotifications from '@pages/admin/Notifications'
import InviteTeam from '@pages/user/team/Invite'
import InvitationInbox from '@pages/user/invitations/Inbox'
import NotFound from '@pages/NotFound'
import LoginHistory from '@pages/user/security/LoginHistory'
import OAuthClients from '@pages/admin/oauth/OAuthClients'
import OAuthConsent from '@pages/auth/OAuthConsent'
import SubscriptionIndex from '@pages/user/subscription/Index'
import ProductsPage from '@pages/user/subscription/Products'
import AdminSubscriptions from '@pages/admin/subscription/Subscriptions'
import AdminProducts from '@pages/admin/subscription/Products'
import AdminPlans from '@pages/admin/subscription/Plans'
import AdminPrices from '@pages/admin/subscription/Prices'
import AdminCoupons from '@pages/admin/subscription/Coupons'
import Payment from '@pages/user/payment/Payment'
import SubscriptionCheckout from '@pages/user/subscription/Checkout'
import OrderConfirm from '@pages/user/order/OrderConfirm'
import OrderSuccess from '@pages/user/order/OrderSuccess'
import About from '@pages/user/About'
import TenantList from '@pages/admin/tenant/TenantList'
import CreateTenant from '@pages/admin/tenant/CreateTenant'
import AppList from '@pages/admin/app/AppList'
import CreateApp from '@pages/admin/app/CreateApp'
import AdminDashboard from '@pages/admin/Dashboard'
import OAuthClientConfig from '@pages/admin/oauth/OAuthClientConfig'
import TenantDashboard from '@pages/tenant/Dashboard'
import TenantApps from '@pages/tenant/Apps'
import TenantInfo from '@pages/tenant/TenantInfo'
import AppDetail from '@pages/tenant/AppDetail'
import AppSettings from '@pages/tenant/AppSettings'
import AppStats from '@pages/tenant/AppStats'
import TenantOAuthClients from '@pages/tenant/OAuthClients'
import TenantUserManagement from '@pages/tenant/UserManagement'
import AppUserManagement from '@pages/tenant/app/AppUserManagement'
import TenantRoleManagement from '@pages/tenant/RoleManagement'
import TenantSubscriptionDashboard from '@pages/tenant/subscription/Dashboard'
import TenantProducts from '@pages/tenant/subscription/Products'
import TenantSubscriptions from '@pages/tenant/subscription/Subscriptions'
import SubscriptionStatusManagement from '@pages/tenant/SubscriptionStatusManagement'
import CouponManagement from '@pages/tenant/CouponManagement'
import PlanManagement from '@pages/tenant/PlanManagement'
import PriceManagement from '@pages/tenant/PriceManagement'

export default function AppRouter() {
  return (
    <Routes>
      {/* 认证页面 - 已登录用户不能访问 */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      <Route path="/oauth-success" element={<OauthSuccess />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />
      
      {/* 主应用页面 - 需要认证保护 */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/help" element={
        <ProtectedRoute>
          <Help />
        </ProtectedRoute>
      } />
      <Route path="/about" element={
        <ProtectedRoute>
          <About />
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <Notifications />
        </ProtectedRoute>
      } />
      
      {/* 订阅系统 - 需要认证保护 */}
      <Route path="/products" element={
        <ProtectedRoute>
          <ProductsPage />
        </ProtectedRoute>
      } />
      <Route path="/subscriptions" element={
        <ProtectedRoute>
          <SubscriptionIndex />
        </ProtectedRoute>
      } />
      <Route path="/subscriptions/checkout" element={
        <ProtectedRoute>
          <SubscriptionCheckout />
        </ProtectedRoute>
      } />
      
      {/* 订单系统 - 需要认证保护 */}
      <Route path="/orders/:orderId/confirm" element={
        <ProtectedRoute>
          <OrderConfirm />
        </ProtectedRoute>
      } />
      <Route path="/orders/:orderId/success" element={
        <ProtectedRoute>
          <OrderSuccess />
        </ProtectedRoute>
      } />
      
      {/* 团队相关页面 - 需要认证保护 */}
      <Route path="/teams" element={
        <ProtectedRoute>
          <TeamIndex />
        </ProtectedRoute>
      } />
      <Route path="/teams/create" element={
        <ProtectedRoute>
          <CreateTeam />
        </ProtectedRoute>
      } />
      <Route path="/teams/:id" element={
        <ProtectedRoute>
          <TeamDetail />
        </ProtectedRoute>
      } />
      <Route path="/teams/:id/members" element={
        <ProtectedRoute>
          <TeamMembers />
        </ProtectedRoute>
      } />
      <Route path="/teams/:id/edit" element={
        <ProtectedRoute>
          <EditTeam />
        </ProtectedRoute>
      } />
      <Route path="/teams/invite/:id" element={
        <ProtectedRoute>
          <InviteTeam />
        </ProtectedRoute>
      } />
      <Route path="/invitations/inbox" element={
        <ProtectedRoute>
          <InvitationInbox />
        </ProtectedRoute>
      } />
      
      {/* 钱包相关页面 - 需要认证保护 */}
      <Route path="/wallet" element={
        <ProtectedRoute>
          <WalletIndex />
        </ProtectedRoute>
      } />
      <Route path="/wallet/recharge" element={
        <ProtectedRoute>
          <Recharge />
        </ProtectedRoute>
      } />
      <Route path="/wallet/withdraw" element={
        <ProtectedRoute>
          <Withdraw />
        </ProtectedRoute>
      } />
      <Route path="/wallet/history" element={
        <ProtectedRoute>
          <History />
        </ProtectedRoute>
      } />
      <Route path="/payment" element={
        <ProtectedRoute>
          <Payment />
        </ProtectedRoute>
      } />
      
      {/* 安全设置 - 需要认证保护 */}
      <Route path="/security" element={
        <ProtectedRoute>
          <SecuritySettings />
        </ProtectedRoute>
      } />
      <Route path="/security/2fa" element={
        <ProtectedRoute>
          <TwoFA />
        </ProtectedRoute>
      } />
      <Route path="/security/passkey" element={
        <ProtectedRoute>
          <PasskeyManagement />
        </ProtectedRoute>
      } />
      <Route path="/security/login-history" element={
        <ProtectedRoute>
          <LoginHistory />
        </ProtectedRoute>
      } />
      
      {/* 管理员页面 - 需要认证保护 */}
      <Route path="/admin/dashboard" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/admin/apps" element={
        <ProtectedRoute>
          <AppList />
        </ProtectedRoute>
      } />
      <Route path="/admin/apps/new" element={
        <ProtectedRoute>
          <CreateApp />
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/admin/roles" element={
        <ProtectedRoute>
          <Roles />
        </ProtectedRoute>
      } />
      <Route path="/admin/wallets" element={
        <ProtectedRoute>
          <WalletsAdmin />
        </ProtectedRoute>
      } />
      <Route path="/admin/logs" element={
        <ProtectedRoute>
          <Logs />
        </ProtectedRoute>
      } />
      <Route path="/admin/subscriptions" element={
        <ProtectedRoute>
          <AdminSubscriptions />
        </ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute>
          <AdminProducts />
        </ProtectedRoute>
      } />
      <Route path="/admin/plans" element={
        <ProtectedRoute>
          <AdminPlans />
        </ProtectedRoute>
      } />
      <Route path="/admin/prices" element={
        <ProtectedRoute>
          <AdminPrices />
        </ProtectedRoute>
      } />
      <Route path="/admin/coupons" element={
        <ProtectedRoute>
          <AdminCoupons />
        </ProtectedRoute>
      } />
      <Route path="/admin/notifications" element={
        <ProtectedRoute>
          <AdminNotifications />
        </ProtectedRoute>
      } />
      <Route path="/admin/oauth-clients" element={
        <ProtectedRoute>
          <OAuthClients />
        </ProtectedRoute>
      } />
      <Route path="/admin/oauth-clients/:id/config" element={
        <ProtectedRoute>
          <OAuthClientConfig />
        </ProtectedRoute>
      } />
      <Route path="/admin/tenants" element={
        <ProtectedRoute>
          <TenantList />
        </ProtectedRoute>
      } />
      <Route path="/admin/tenants/new" element={
        <ProtectedRoute>
          <CreateTenant />
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      
      {/* 租户管理页面 - 需要认证保护 */}
      <Route path="/tenant/dashboard" element={
        <ProtectedRoute>
          <TenantDashboard />
        </ProtectedRoute>
      } />
      <Route path="/tenant/info" element={
        <ProtectedRoute>
          <TenantInfo />
        </ProtectedRoute>
      } />
      <Route path="/tenant/apps" element={
        <ProtectedRoute>
          <TenantApps />
        </ProtectedRoute>
      } />
      <Route path="/tenant/apps/new" element={
        <ProtectedRoute>
          <CreateApp />
        </ProtectedRoute>
      } />
      <Route path="/tenant/apps/:id" element={
        <ProtectedRoute>
          <AppDetail />
        </ProtectedRoute>
      } />
      <Route path="/tenant/apps/:id/settings" element={
        <ProtectedRoute>
          <AppSettings />
        </ProtectedRoute>
      } />
      <Route path="/tenant/apps/:id/stats" element={
        <ProtectedRoute>
          <AppStats />
        </ProtectedRoute>
      } />
      <Route path="/tenant/oauth/clients" element={
        <ProtectedRoute>
          <TenantOAuthClients />
        </ProtectedRoute>
      } />
      <Route path="/tenant/users" element={
        <ProtectedRoute>
          <TenantUserManagement />
        </ProtectedRoute>
      } />
      <Route path="/tenant/notifications" element={
        <ProtectedRoute>
          <TenantNotifications />
        </ProtectedRoute>
      } />
      <Route path="/tenant/roles" element={
        <ProtectedRoute>
          <TenantRoleManagement />
        </ProtectedRoute>
      } />
      
      {/* 租户订阅管理页面 */}
      <Route path="/tenant/subscriptions" element={
        <ProtectedRoute>
          <TenantSubscriptionDashboard />
        </ProtectedRoute>
      } />
      <Route path="/tenant/subscriptions/products" element={
        <ProtectedRoute>
          <TenantProducts />
        </ProtectedRoute>
      } />
      <Route path="/tenant/subscriptions/plans" element={
        <ProtectedRoute>
          <TenantSubscriptions />
        </ProtectedRoute>
      } />
      <Route path="/tenant/subscription-status" element={
        <ProtectedRoute>
          <SubscriptionStatusManagement />
        </ProtectedRoute>
      } />
      <Route path="/tenant/coupons" element={
        <ProtectedRoute>
          <CouponManagement />
        </ProtectedRoute>
      } />
      <Route path="/tenant/plans" element={
        <ProtectedRoute>
          <PlanManagement />
        </ProtectedRoute>
      } />
      <Route path="/tenant/prices" element={
        <ProtectedRoute>
          <PriceManagement />
        </ProtectedRoute>
      } />
      
      <Route path="/tenant/apps/:id/users" element={
        <ProtectedRoute>
          <AppUserManagement />
        </ProtectedRoute>
      } />
      
      {/* 默认重定向 - 需要认证保护 */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
} 