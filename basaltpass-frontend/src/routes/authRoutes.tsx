import { Route } from 'react-router-dom'
import PublicRoute from '@routes/PublicRoute'
import Login from '@pages/auth/Login'
import TenantLogin from '@features/auth/TenantLogin'
import TenantRegister from '@features/auth/TenantRegister'
import Register from '@pages/auth/Register'
import OauthSuccess from '@pages/auth/OauthSuccess'
import OAuthConsent from '@pages/auth/OAuthConsent'
import Terms from '@pages/auth/Terms'
import Privacy from '@pages/auth/Privacy'
import ResetPassword from '@pages/auth/ResetPassword'
import EmailChangeConfirm from '@pages/auth/EmailChangeConfirm'
import EmailChangeCancel from '@pages/auth/EmailChangeCancel'

export function AuthRoutes() {
  return (
    <>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/auth/tenant/:tenantCode/login" element={<TenantLogin />} />
      <Route path="/auth/tenant/:tenantCode/register" element={<TenantRegister />} />
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
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/email-change/confirm" element={<EmailChangeConfirm />} />
      <Route path="/email-change/cancel" element={<EmailChangeCancel />} />
    </>
  )
}
