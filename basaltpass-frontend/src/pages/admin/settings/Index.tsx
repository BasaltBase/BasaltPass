import { Navigate } from 'react-router-dom'
import { adminSettingsCategories } from './categories'

export default function AdminSettingsPage() {
  // 重定向到第一个分类
  return <Navigate to={`/admin/settings/${adminSettingsCategories[0].key}`} replace />
}
