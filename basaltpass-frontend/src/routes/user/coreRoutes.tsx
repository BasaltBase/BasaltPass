import { Route } from 'react-router-dom'
import Dashboard from '@pages/user/Dashboard'
import Profile from '@pages/user/profile/Index'
import Settings from '@pages/user/Settings'
import Help from '@pages/user/Help'
import About from '@pages/user/About'
import Notifications from '@pages/user/Notifications'
import { withProtected } from '@/routes/helpers'

export function UserCoreRoutes() {
  return (
    <>
      <Route path="/dashboard" element={withProtected(<Dashboard />)} />
      <Route path="/profile" element={withProtected(<Profile />)} />
      <Route path="/settings" element={withProtected(<Settings />)} />
      <Route path="/help" element={withProtected(<Help />)} />
      <Route path="/about" element={withProtected(<About />)} />
      <Route path="/notifications" element={withProtected(<Notifications />)} />
    </>
  )
}
