import { Route } from 'react-router-dom'
import SecuritySettings from '@pages/user/security/SecuritySettings'
import TwoFA from '@pages/user/security/TwoFA'
import PasskeyManagement from '@pages/user/security/PasskeyManagement'
import LoginHistory from '@pages/user/security/LoginHistory'
import { withProtected } from '@/routes/helpers'

export function UserSecurityRoutes() {
  return (
    <>
      <Route path="/security" element={withProtected(<SecuritySettings />)} />
      <Route path="/security/2fa" element={withProtected(<TwoFA />)} />
      <Route path="/security/passkey" element={withProtected(<PasskeyManagement />)} />
      <Route path="/security/login-history" element={withProtected(<LoginHistory />)} />
    </>
  )
}
