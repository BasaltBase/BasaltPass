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

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/oauth-success" element={<OauthSuccess />} />
        <Route path="/admin/roles" element={<Roles />} />
        <Route path="/wallet" element={<WalletIndex />} />
        <Route path="/wallet/recharge" element={<Recharge />} />
        <Route path="/wallet/withdraw" element={<Withdraw />} />
        <Route path="/wallet/history" element={<History />} />
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
} 