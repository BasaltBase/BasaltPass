import { BrowserRouter, Routes, Route } from 'react-router-dom'
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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 认证页面 - 不需要Layout */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth-success" element={<OauthSuccess />} />
        <Route path="/oauth-consent" element={<OAuthConsent />} />
        
        {/* 主应用页面 - 内部已使用Layout */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        <Route path="/notifications" element={<Notifications />} />
        {/* 订阅系统 */}
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/subscriptions" element={<SubscriptionIndex />} />
        
        {/* 团队相关页面 - 需要添加Layout */}
        <Route path="/teams" element={<TeamIndex />} />
        <Route path="/teams/create" element={<CreateTeam />} />
        <Route path="/teams/:id" element={<TeamDetail />} />
        <Route path="/teams/:id/members" element={<TeamMembers />} />
        <Route path="/teams/:id/edit" element={<EditTeam />} />
        <Route path="/teams/invite/:id" element={<InviteTeam />} />
        <Route path="/invitations/inbox" element={<InvitationInbox />} />
        
        {/* 钱包相关页面 - 内部已使用Layout */}
        <Route path="/wallet" element={<WalletIndex />} />
        <Route path="/wallet/recharge" element={<Recharge />} />
        <Route path="/wallet/withdraw" element={<Withdraw />} />
        <Route path="/wallet/history" element={<History />} />
        
        {/* 安全设置 - 内部已使用Layout */}
        <Route path="/security" element={<SecuritySettings />} />
        <Route path="/security/2fa" element={<TwoFA />} />
        <Route path="/security/passkey" element={<PasskeyManagement />} />
        <Route path="/security/login-history" element={<LoginHistory />} />
        
        {/* 管理员页面 */}
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/roles" element={<Roles />} />
        <Route path="/admin/wallets" element={<WalletsAdmin />} />
        <Route path="/admin/logs" element={<Logs />} />
        <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
        <Route path="/admin/products" element={<AdminProducts />} />
        <Route path="/admin/plans" element={<AdminPlans />} />
        <Route path="/admin/prices" element={<AdminPrices />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/notifications" element={<AdminNotifications />} />
        <Route path="/admin/oauth-clients" element={<OAuthClients />} />
        
        {/* 默认重定向 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
} 