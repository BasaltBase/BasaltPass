import { Route } from 'react-router-dom'
import AdminSettingsPage from '@pages/admin/settings/Index'
import SettingsCategoryPage from '@pages/admin/settings/SettingsCategoryPage'
import { withAdmin } from '@/routes/helpers'

export function AdminSettingsRoutes() {
  return (
    <>
      <Route path="/admin/settings/:category" element={withAdmin(<SettingsCategoryPage />)} />
      <Route path="/admin/settings" element={withAdmin(<AdminSettingsPage />)} />
    </>
  )
}
