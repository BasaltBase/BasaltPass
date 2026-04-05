import { Route } from 'react-router-dom'
import TeamIndex from '@pages/user/team/Index'
import CreateTeam from '@pages/user/team/Create'
import TeamDetail from '@pages/user/team/Detail'
import TeamMembers from '@pages/user/team/Members'
import EditTeam from '@pages/user/team/Edit'
import InviteTeam from '@pages/user/team/Invite'
import InvitationInbox from '@pages/user/invitations/Inbox'
import { withProtected } from '@/routes/helpers'

export function UserTeamRoutes() {
  return (
    <>
      <Route path="/teams" element={withProtected(<TeamIndex />)} />
      <Route path="/teams/create" element={withProtected(<CreateTeam />)} />
      <Route path="/teams/:id" element={withProtected(<TeamDetail />)} />
      <Route path="/teams/:id/members" element={withProtected(<TeamMembers />)} />
      <Route path="/teams/:id/edit" element={withProtected(<EditTeam />)} />
      <Route path="/teams/invite/:id" element={withProtected(<InviteTeam />)} />
      <Route path="/invitations/inbox" element={withProtected(<InvitationInbox />)} />
    </>
  )
}
