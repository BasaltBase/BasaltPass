import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '@routes/ProtectedRoute'
import Dashboard from '@pages/user/Dashboard'
import NotFound from '@pages/NotFound'
import { AdminRoutes } from '@/routes/adminRoutes'
import { AuthRoutes } from '@/routes/authRoutes'
import { TenantRoutes } from '@/routes/tenantRoutes'
import { UserRoutes } from '@/routes/userRoutes'

export default function AppRouter() {
  return (
    <Routes>
      <AuthRoutes />
      <UserRoutes />
      <AdminRoutes />
      <TenantRoutes />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
