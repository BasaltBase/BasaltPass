import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from '@routes/ProtectedRoute'
import PublicRoute from '@routes/PublicRoute'
import Login from '../../../src/features/auth/Login'
import Register from '../../../src/features/auth/Register'
import OauthSuccess from '../../../src/features/auth/OauthSuccess'
import OAuthConsent from '../../../src/features/auth/OAuthConsent'

import Dashboard from '../../../src/features/user/Dashboard'
import Profile from '../../../src/features/user/profile/Index'
import Settings from '../../../src/features/user/Settings'
import Help from '../../../src/features/user/Help'
import About from '../../../src/features/user/About'
import Notifications from '../../../src/features/user/Notifications'

import TeamIndex from '../../../src/features/user/team/Index'
import CreateTeam from '../../../src/features/user/team/Create'
import TeamDetail from '../../../src/features/user/team/Detail'
import TeamMembers from '../../../src/features/user/team/Members'
import EditTeam from '../../../src/features/user/team/Edit'
import InviteTeam from '../../../src/features/user/team/Invite'
import InvitationInbox from '../../../src/features/user/invitations/Inbox'

import WalletIndex from '../../../src/features/user/wallet/Index'
import Recharge from '../../../src/features/user/wallet/Recharge'
import Withdraw from '../../../src/features/user/wallet/Withdraw'
import History from '../../../src/features/user/wallet/History'
import Payment from '../../../src/features/user/payment/Payment'

import SecuritySettings from '../../../src/features/user/security/SecuritySettings'
import TwoFA from '../../../src/features/user/security/TwoFA'
import PasskeyManagement from '../../../src/features/user/security/PasskeyManagement'
import LoginHistory from '../../../src/features/user/security/LoginHistory'

import UserAppsIndex from '../../../src/features/user/apps/Index'
import UserAppDetail from '../../../src/features/user/apps/Detail'

import SubscriptionIndex from '../../../src/features/user/subscription/Index'
import ProductsPage from '../../../src/features/user/subscription/Products'
import SubscriptionCheckout from '../../../src/features/user/subscription/Checkout'

import OrderConfirm from '../../../src/features/user/order/OrderConfirm'
import OrderSuccess from '../../../src/features/user/order/OrderSuccess'

import NotFound from '../../../src/features/NotFound'

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
      <Route path="/my-apps/:id" element={<ProtectedRoute><UserAppDetail /></ProtectedRoute>} />

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
