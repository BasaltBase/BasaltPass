import { Route } from 'react-router-dom'
import Users from '@pages/admin/user/Users'
import UserDetail from '@pages/admin/user/UserDetail'
import Roles from '@pages/admin/user/Roles'
import AdminPermissions from '@pages/admin/rbac/Permissions'
import { withAdmin } from '@/routes/helpers'

export function AdminAccessRoutes() {
  return (
    <>
      <Route path="/admin/users" element={withAdmin(<Users />)} />
      <Route path="/admin/users/:id" element={withAdmin(<UserDetail />)} />
      <Route path="/admin/roles" element={withAdmin(<Roles />)} />
      <Route path="/admin/permissions" element={withAdmin(<AdminPermissions />)} />
    </>
  )
}
