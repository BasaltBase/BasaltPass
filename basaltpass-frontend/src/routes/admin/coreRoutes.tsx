import { Route } from 'react-router-dom'
import AdminDashboard from '@pages/admin/Dashboard'
import Logs from '@pages/admin/Logs'
import AdminNotifications from '@pages/admin/notification/Notifications'
import AdminTeamsPage from '@pages/admin/team/Teams'
import AdminInvitationsPage from '@pages/admin/invitation/Invitations'
import { withAdmin } from '@/routes/helpers'

export function AdminCoreRoutes() {
  return (
    <>
      <Route path="/admin/dashboard" element={withAdmin(<AdminDashboard />)} />
      <Route path="/admin/logs" element={withAdmin(<Logs />)} />
      <Route path="/admin/notifications" element={withAdmin(<AdminNotifications />)} />
      <Route path="/admin/teams" element={withAdmin(<AdminTeamsPage />)} />
      <Route path="/admin/invitations" element={withAdmin(<AdminInvitationsPage />)} />
    </>
  )
}
