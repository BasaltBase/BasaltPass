export const ROUTES = {
  admin: {
    root: '/admin',
    dashboard: '/admin/dashboard',
    notifications: '/admin/notifications'
  },
  tenant: {
    root: '/tenant',
    dashboard: '/tenant/dashboard',
    notifications: '/tenant/notifications'
  },
  user: {
    dashboard: '/dashboard',
    login: '/login',
    notifications: '/notifications'
  }
} as const
