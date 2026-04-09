import { Navigate } from 'react-router-dom'
import { adminSettingsCategories } from './categories'

export default function AdminSettingsPage() {
  // Redirect to the first category
  return <Navigate to={`/admin/settings/${adminSettingsCategories[0].key}`} replace />
}
