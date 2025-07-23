import { Routes, Route } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/profile/Index'
import OauthSuccess from './pages/auth/OauthSuccess'
import Roles from './pages/admin/Roles'
import Users from './pages/admin/Users'
import WalletIndex from './pages/wallet/Index'
import Recharge from './pages/wallet/Recharge'
import Withdraw from './pages/wallet/Withdraw'
import History from './pages/wallet/History'
import WalletsAdmin from './pages/admin/Wallets'
import Logs from './pages/admin/Logs'
import SecuritySettings from './pages/security/SecuritySettings'
import TwoFA from './pages/security/TwoFA'
import PasskeyManagement from './pages/security/PasskeyManagement'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Help from './pages/Help'
import TeamIndex from './pages/team/Index'
import CreateTeam from './pages/team/Create'
import TeamDetail from './pages/team/Detail'
import TeamMembers from './pages/team/Members'
import EditTeam from './pages/team/Edit'
import Notifications from './pages/Notifications'
import AdminNotifications from './pages/admin/Notifications'
import InviteTeam from './pages/team/Invite'
import InvitationInbox from './pages/invitations/Inbox'
import NotFound from './pages/NotFound'
import LoginHistory from './pages/security/LoginHistory'
import OAuthClients from './pages/admin/OAuthClients'
import OAuthConsent from './pages/auth/OAuthConsent'
import SubscriptionIndex from './pages/subscription/Index'
import ProductsPage from './pages/subscription/Products'
import AdminSubscriptions from './pages/admin/Subscriptions'
import AdminProducts from './pages/admin/Products'
import AdminPlans from './pages/admin/Plans'
import AdminPrices from './pages/admin/Prices'
import AdminCoupons from './pages/admin/Coupons'
import Payment from './pages/payment/Payment'
import SubscriptionCheckout from './pages/subscription/Checkout'
import OrderConfirm from './pages/order/OrderConfirm'
import OrderSuccess from './pages/order/OrderSuccess'

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