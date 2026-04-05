import { Route } from 'react-router-dom'
import AppList from '@pages/admin/app/AppList'
import CreateApp from '@pages/admin/app/CreateApp'
import OAuthClients from '@pages/admin/oauth/OAuthClients'
import OAuthClientConfig from '@pages/admin/oauth/OAuthClientConfig'
import { withAdmin } from '@/routes/helpers'

export function AdminAppRoutes() {
  return (
    <>
      <Route path="/admin/apps" element={withAdmin(<AppList />)} />
      <Route path="/admin/apps/new" element={withAdmin(<CreateApp />)} />
      <Route path="/admin/oauth-clients" element={withAdmin(<OAuthClients />)} />
      <Route path="/admin/oauth-clients/:id/config" element={withAdmin(<OAuthClientConfig />)} />
    </>
  )
}
