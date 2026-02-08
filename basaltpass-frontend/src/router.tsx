import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from '@routes/ProtectedRoute'
import PublicRoute from '@routes/PublicRoute'
import AdminRoute from '@features/admin/components/AdminRoute'
import TenantRoute from '@features/tenant/components/TenantRoute'
import Login from '@pages/auth/Login'
import Register from '@pages/auth/Register'
import Profile from '@pages/user/profile/Index'
import OauthSuccess from '@pages/auth/OauthSuccess'
import Roles from '@pages/admin/user/Roles'
import Users from '@pages/admin/user/Users'
import UserDetail from '@pages/admin/user/UserDetail'
import WalletIndex from '@pages/user/wallet/Index'
import Recharge from '@pages/user/wallet/Recharge'
import Withdraw from '@pages/user/wallet/Withdraw'
import History from '@pages/user/wallet/History'
import WalletsAdmin from '@pages/admin/user/Wallets'
import WalletManagement from '@pages/admin/wallet/WalletManagement'
import Logs from '@pages/admin/Logs'
import SecuritySettings from '@pages/user/security/SecuritySettings'
import TwoFA from '@pages/user/security/TwoFA'
import PasskeyManagement from '@pages/user/security/PasskeyManagement'
import ResetPassword from '@pages/auth/ResetPassword'
import EmailChangeConfirm from '@pages/auth/EmailChangeConfirm'
import EmailChangeCancel from '@pages/auth/EmailChangeCancel'
import Dashboard from '@pages/user/Dashboard'
import Settings from '@pages/user/Settings'
import Help from '@pages/user/Help'
import UserAppsIndex from '@pages/user/apps/Index'
import UserAppDetail from '@pages/user/apps/Detail'
import TeamIndex from '@pages/user/team/Index'
import CreateTeam from '@pages/user/team/Create'
import TeamDetail from '@pages/user/team/Detail'
import TeamMembers from '@pages/user/team/Members'
import EditTeam from '@pages/user/team/Edit'
import Notifications from '@pages/user/Notifications'
import TenantNotifications from '@pages/tenant/notification/Notifications'
import AdminNotifications from '@pages/admin/notification/Notifications'
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
import AdminPermissions from '@pages/admin/rbac/Permissions'
import AdminSettingsPage from '@pages/admin/settings/Index'
import SettingsCategoryPage from '@pages/admin/settings/SettingsCategoryPage'
import Payment from '@pages/user/payment/Payment'
import SubscriptionCheckout from '@pages/user/subscription/Checkout'
import OrderConfirm from '@pages/user/order/OrderConfirm'
import OrderSuccess from '@pages/user/order/OrderSuccess'
import About from '@pages/user/About'
import TenantList from '@pages/admin/tenant/TenantList'
import CreateTenant from '@pages/admin/tenant/CreateTenant'
import TenantDetail from '@pages/admin/tenant/TenantDetail'
import EditTenant from '@pages/admin/tenant/EditTenant'
import TenantUsers from '@pages/admin/tenant/TenantUsers'
import AppList from '@pages/admin/app/AppList'
import CreateApp from '@pages/admin/app/CreateApp'
import AdminDashboard from '@pages/admin/Dashboard'
import OAuthClientConfig from '@pages/admin/oauth/OAuthClientConfig'
import TenantDashboard from '@pages/tenant/Dashboard'
import TenantApps from '@pages/tenant/app/Apps'
import TenantInfo from '@pages/tenant/TenantInfo'
import AppDetail from '@pages/tenant/app/AppDetail'
import AppSettings from '@pages/tenant/app/AppSettings'
import AppStats from '@pages/tenant/app/AppStats'
import TenantOAuthClients from '@pages/tenant/app/OAuthClients'
import TenantUserManagement from '@pages/tenant/user/UserManagement'
import AppUserManagement from '@pages/tenant/app/AppUserManagement'
import AppRoleManagement from '@pages/tenant/app/AppRoleManagement'
import AppPermissionManagement from '@pages/tenant/app/AppPermissionManagement'
import TenantRoleManagement from '@pages/tenant/user/RoleManagement'
import TenantPermissionManagement from '@pages/tenant/permission/TenantPermissionManagement'
import TenantSubscriptionDashboard from '@pages/tenant/subscription/Dashboard'
import TenantProducts from '@pages/tenant/subscription/Products'
import TenantSubscriptions from '@pages/tenant/subscription/Subscriptions'
import TenantSubscriptionDetail from '@pages/tenant/subscription/SubscriptionDetail'
import TenantPlans from '@pages/tenant/subscription/Plans'
import TenantPrices from '@pages/tenant/subscription/Prices'
import TenantCoupons from '@pages/tenant/subscription/Coupons'
import TenantInvoices from '@pages/tenant/subscription/Invoices'
import SubscriptionStatusManagement from '@pages/tenant/subscription/SubscriptionStatusManagement'
import CouponManagement from '@pages/tenant/subscription/CouponManagement'
import PlanManagement from '@pages/tenant/subscription/PlanManagement'
import PriceManagement from '@pages/tenant/subscription/PriceManagement'
import AdminTeamsPage from '@pages/admin/team/Teams'
import AdminInvitationsPage from '@pages/admin/invitation/Invitations'

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
      
      {/* 密码重置和邮箱变更 - 公开页面 */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/email-change/confirm" element={<EmailChangeConfirm />} />
      <Route path="/email-change/cancel" element={<EmailChangeCancel />} />
      
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
      <Route path="/my-apps" element={
        <ProtectedRoute>
          <UserAppsIndex />
        </ProtectedRoute>
      } />
      <Route path="/my-apps/:id" element={
        <ProtectedRoute>
          <UserAppDetail />
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
        <AdminRoute>
          <AdminDashboard />
        </AdminRoute>
      } />
      <Route path="/admin/apps" element={
        <AdminRoute>
          <AppList />
        </AdminRoute>
      } />
      <Route path="/admin/apps/new" element={
        <AdminRoute>
          <CreateApp />
        </AdminRoute>
      } />
      <Route path="/admin/users" element={
        <AdminRoute>
          <Users />
        </AdminRoute>
      } />
      <Route path="/admin/users/:id" element={
        <AdminRoute>
          <UserDetail />
        </AdminRoute>
      } />
      <Route path="/admin/roles" element={
        <AdminRoute>
          <Roles />
        </AdminRoute>
      } />
      <Route path="/admin/permissions" element={
        <AdminRoute>
          <AdminPermissions />
        </AdminRoute>
      } />
      <Route path="/admin/teams" element={
        <AdminRoute>
          <AdminTeamsPage />
        </AdminRoute>
      } />
      <Route path="/admin/invitations" element={
        <AdminRoute>
          <AdminInvitationsPage />
        </AdminRoute>
      } />
      <Route path="/admin/wallets" element={
        <AdminRoute>
          <WalletManagement />
        </AdminRoute>
      } />
      <Route path="/admin/wallets/legacy" element={
        <AdminRoute>
          <WalletsAdmin />
        </AdminRoute>
      } />
      <Route path="/admin/logs" element={
        <AdminRoute>
          <Logs />
        </AdminRoute>
      } />
      <Route path="/admin/subscriptions" element={
        <AdminRoute>
          <AdminSubscriptions />
        </AdminRoute>
      } />
      <Route path="/admin/products" element={
        <AdminRoute>
          <AdminProducts />
        </AdminRoute>
      } />
      <Route path="/admin/plans" element={
        <AdminRoute>
          <AdminPlans />
        </AdminRoute>
      } />
      <Route path="/admin/prices" element={
        <AdminRoute>
          <AdminPrices />
        </AdminRoute>
      } />
      <Route path="/admin/coupons" element={
        <AdminRoute>
          <AdminCoupons />
        </AdminRoute>
      } />
      <Route path="/admin/notifications" element={
        <AdminRoute>
          <AdminNotifications />
        </AdminRoute>
      } />
      <Route path="/admin/oauth-clients" element={
        <AdminRoute>
          <OAuthClients />
        </AdminRoute>
      } />
      <Route path="/admin/oauth-clients/:id/config" element={
        <AdminRoute>
          <OAuthClientConfig />
        </AdminRoute>
      } />
      <Route path="/admin/tenants" element={
        <AdminRoute>
          <TenantList />
        </AdminRoute>
      } />
      <Route path="/admin/tenants/create" element={
        <AdminRoute>
          <CreateTenant />
        </AdminRoute>
      } />
      <Route path="/admin/tenants/:id" element={
        <AdminRoute>
          <TenantDetail />
        </AdminRoute>
      } />
      <Route path="/admin/tenants/:id/edit" element={
        <AdminRoute>
          <EditTenant />
        </AdminRoute>
      } />
      <Route path="/admin/tenants/:id/users" element={
        <AdminRoute>
          <TenantUsers />
        </AdminRoute>
      } />
      <Route path="/admin/settings/:category" element={
        <AdminRoute>
          <SettingsCategoryPage />
        </AdminRoute>
      } />
      <Route path="/admin/settings" element={
        <AdminRoute>
          <AdminSettingsPage />
        </AdminRoute>
      } />
      
      {/* 租户管理页面 - 需要认证保护 */}
      <Route path="/tenant/dashboard" element={
        <TenantRoute>
          <TenantDashboard />
        </TenantRoute>
      } />
      <Route path="/tenant/info" element={
        <TenantRoute>
          <TenantInfo />
        </TenantRoute>
      } />
      <Route path="/tenant/apps" element={
        <TenantRoute>
          <TenantApps />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/new" element={
        <TenantRoute>
          <CreateApp />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/:id/settings" element={
        <TenantRoute>
          <AppSettings />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/:id/stats" element={
        <TenantRoute>
          <AppStats />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/:id/users" element={
        <TenantRoute>
          <AppUserManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/:id/roles" element={
        <TenantRoute>
          <AppRoleManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/:id/permissions" element={
        <TenantRoute>
          <AppPermissionManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/apps/:id" element={
        <TenantRoute>
          <AppDetail />
        </TenantRoute>
      } />
      <Route path="/tenant/oauth/clients" element={
        <TenantRoute>
          <TenantOAuthClients />
        </TenantRoute>
      } />
      <Route path="/tenant/users" element={
        <TenantRoute>
          <TenantUserManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/notifications" element={
        <TenantRoute>
          <TenantNotifications />
        </TenantRoute>
      } />
      <Route path="/tenant/roles" element={
        <TenantRoute>
          <TenantRoleManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/permissions" element={
        <TenantRoute>
          <TenantPermissionManagement />
        </TenantRoute>
      } />
      
      {/* 租户订阅管理页面 */}
      <Route path="/tenant/subscriptions" element={
        <TenantRoute>
          <TenantSubscriptionDashboard />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/products" element={
        <TenantRoute>
          <TenantProducts />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/plans" element={
        <TenantRoute>
          <TenantPlans />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/prices" element={
        <TenantRoute>
          <TenantPrices />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/subscriptions" element={
        <TenantRoute>
          <TenantSubscriptions />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/detail/:id" element={
        <TenantRoute>
          <TenantSubscriptionDetail />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/coupons" element={
        <TenantRoute>
          <TenantCoupons />
        </TenantRoute>
      } />
      <Route path="/tenant/subscriptions/invoices" element={
        <TenantRoute>
          <TenantInvoices />
        </TenantRoute>
      } />
      <Route path="/tenant/subscription-status" element={
        <TenantRoute>
          <SubscriptionStatusManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/coupons" element={
        <TenantRoute>
          <CouponManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/plans" element={
        <TenantRoute>
          <PlanManagement />
        </TenantRoute>
      } />
      <Route path="/tenant/prices" element={
        <TenantRoute>
          <PriceManagement />
        </TenantRoute>
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