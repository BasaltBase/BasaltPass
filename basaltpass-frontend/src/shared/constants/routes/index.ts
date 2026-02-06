import { ADMIN_ROUTES } from './admin'
import { TENANT_ROUTES } from './tenant'
import { USER_ROUTES } from './user'

export const ROUTES = {
  admin: ADMIN_ROUTES,
  tenant: TENANT_ROUTES,
  user: USER_ROUTES
} as const

export { ADMIN_ROUTES, TENANT_ROUTES, USER_ROUTES }
