import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '../../../src/components/ProtectedRoute'
import PublicRoute from '../../../src/components/PublicRoute'
import Login from '../../../src/pages/auth/Login'
import Register from '../../../src/pages/auth/Register'
import OauthSuccess from '../../../src/pages/auth/OauthSuccess'
import OAuthConsent from '../../../src/pages/auth/OAuthConsent'

import Dashboard from '../../../src/pages/user/Dashboard'
import Profile from '../../../src/pages/user/profile/Index'
import Settings from '../../../src/pages/user/Settings'
import Help from '../../../src/pages/user/Help'
import About from '../../../src/pages/user/About'
import Notifications from '../../../src/pages/user/Notifications'

import TeamIndex from '../../../src/pages/user/team/Index'
import CreateTeam from '../../../src/pages/user/team/Create'
import TeamDetail from '../../../src/pages/user/team/Detail'
import TeamMembers from '../../../src/pages/user/team/Members'
import EditTeam from '../../../src/pages/user/team/Edit'
import InviteTeam from '../../../src/pages/user/team/Invite'
import InvitationInbox from '../../../src/pages/user/invitations/Inbox'

import WalletIndex from '../../../src/pages/user/wallet/Index'
import Recharge from '../../../src/pages/user/wallet/Recharge'
import Withdraw from '../../../src/pages/user/wallet/Withdraw'
import History from '../../../src/pages/user/wallet/History'
import Payment from '../../../src/pages/user/payment/Payment'

import SecuritySettings from '../../../src/pages/user/security/SecuritySettings'
import TwoFA from '../../../src/pages/user/security/TwoFA'
import PasskeyManagement from '../../../src/pages/user/security/PasskeyManagement'
import LoginHistory from '../../../src/pages/user/security/LoginHistory'

import UserAppsIndex from '../../../src/pages/user/apps/Index'

import SubscriptionIndex from '../../../src/pages/user/subscription/Index'
import ProductsPage from '../../../src/pages/user/subscription/Products'
import SubscriptionCheckout from '../../../src/pages/user/subscription/Checkout'

import OrderConfirm from '../../../src/pages/user/order/OrderConfirm'
import OrderSuccess from '../../../src/pages/user/order/OrderSuccess'

import NotFound from '../../../src/pages/NotFound'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public auth */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route path="/oauth-success" element={<OauthSuccess />} />
      <Route path="/oauth-consent" element={<OAuthConsent />} />

      {/* User console */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/help"
        element={
          <ProtectedRoute>
            <Help />
          </ProtectedRoute>
        }
      />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* Teams */}
      <Route path="/teams" element={<ProtectedRoute><TeamIndex /></ProtectedRoute>} />
      <Route path="/teams/create" element={<ProtectedRoute><CreateTeam /></ProtectedRoute>} />
      <Route path="/teams/:id" element={<ProtectedRoute><TeamDetail /></ProtectedRoute>} />
      <Route path="/teams/:id/members" element={<ProtectedRoute><TeamMembers /></ProtectedRoute>} />
      <Route path="/teams/:id/edit" element={<ProtectedRoute><EditTeam /></ProtectedRoute>} />
      <Route path="/teams/invite/:id" element={<ProtectedRoute><InviteTeam /></ProtectedRoute>} />
      <Route path="/invitations/inbox" element={<ProtectedRoute><InvitationInbox /></ProtectedRoute>} />

      {/* Wallet */}
      <Route path="/wallet" element={<ProtectedRoute><WalletIndex /></ProtectedRoute>} />
      <Route path="/wallet/recharge" element={<ProtectedRoute><Recharge /></ProtectedRoute>} />
      <Route path="/wallet/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
      <Route path="/wallet/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />

      {/* Security */}
      <Route path="/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
      <Route path="/security/2fa" element={<ProtectedRoute><TwoFA /></ProtectedRoute>} />
      <Route path="/security/passkeys" element={<ProtectedRoute><PasskeyManagement /></ProtectedRoute>} />
      <Route path="/security/login-history" element={<ProtectedRoute><LoginHistory /></ProtectedRoute>} />

      {/* Apps */}
      <Route path="/my-apps" element={<ProtectedRoute><UserAppsIndex /></ProtectedRoute>} />

      {/* Subscriptions */}
      <Route path="/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionIndex /></ProtectedRoute>} />
      <Route path="/subscriptions/checkout" element={<ProtectedRoute><SubscriptionCheckout /></ProtectedRoute>} />

      {/* Orders */}
      <Route path="/orders/:orderId/confirm" element={<ProtectedRoute><OrderConfirm /></ProtectedRoute>} />
      <Route path="/orders/:orderId/success" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
