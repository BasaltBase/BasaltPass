import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Profile from './pages/profile/Index'
import OauthSuccess from './pages/auth/OauthSuccess'
import Roles from './pages/admin/Roles'
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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 认证页面 */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/oauth-success" element={<OauthSuccess />} />
        
        {/* 主应用页面 */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/help" element={<Help />} />
        
        {/* 钱包相关页面 */}
        <Route path="/wallet" element={<WalletIndex />} />
        <Route path="/wallet/recharge" element={<Recharge />} />
        <Route path="/wallet/withdraw" element={<Withdraw />} />
        <Route path="/wallet/history" element={<History />} />
        
        {/* 安全设置 */}
        <Route path="/security" element={<SecuritySettings />} />
        <Route path="/security/2fa" element={<TwoFA />} />
        <Route path="/security/passkey" element={<PasskeyManagement />} />
        
        {/* 管理员页面 */}
        <Route path="/admin/roles" element={<Roles />} />
        <Route path="/admin/wallets" element={<WalletsAdmin />} />
        <Route path="/admin/logs" element={<Logs />} />
        
        {/* 默认重定向 */}
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
} 