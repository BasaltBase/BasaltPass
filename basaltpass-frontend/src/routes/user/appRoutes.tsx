import { Route } from 'react-router-dom'
import UserAppsIndex from '@pages/user/apps/Index'
import UserAppDetail from '@pages/user/apps/Detail'
import { withProtected } from '@/routes/helpers'

export function UserAppRoutes() {
  return (
    <>
      <Route path="/my-apps" element={withProtected(<UserAppsIndex />)} />
      <Route path="/my-apps/:id" element={withProtected(<UserAppDetail />)} />
    </>
  )
}
