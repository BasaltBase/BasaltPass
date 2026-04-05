import { UserAppRoutes } from '@/routes/user/appRoutes'
import { UserCommerceRoutes } from '@/routes/user/commerceRoutes'
import { UserCoreRoutes } from '@/routes/user/coreRoutes'
import { UserSecurityRoutes } from '@/routes/user/securityRoutes'
import { UserTeamRoutes } from '@/routes/user/teamRoutes'
import { UserWalletRoutes } from '@/routes/user/walletRoutes'

export function UserRoutes() {
  return (
    <>
      <UserCoreRoutes />
      <UserAppRoutes />
      <UserTeamRoutes />
      <UserWalletRoutes />
      <UserSecurityRoutes />
      <UserCommerceRoutes />
    </>
  )
}
