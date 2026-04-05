import { Route } from 'react-router-dom'
import WalletManagement from '@pages/admin/wallet/WalletManagement'
import WalletsAdmin from '@pages/admin/user/Wallets'
import AdminSubscriptions from '@pages/admin/subscription/Subscriptions'
import AdminProducts from '@pages/admin/subscription/Products'
import AdminPlans from '@pages/admin/subscription/Plans'
import AdminPrices from '@pages/admin/subscription/Prices'
import AdminCoupons from '@pages/admin/subscription/Coupons'
import { withAdmin, withAdminMarket } from '@/routes/helpers'

export function AdminBillingRoutes() {
  return (
    <>
      <Route path="/admin/wallets" element={withAdmin(<WalletManagement />)} />
      <Route path="/admin/wallets/legacy" element={withAdmin(<WalletsAdmin />)} />
      <Route path="/admin/subscriptions" element={withAdminMarket(<AdminSubscriptions />)} />
      <Route path="/admin/products" element={withAdminMarket(<AdminProducts />)} />
      <Route path="/admin/plans" element={withAdminMarket(<AdminPlans />)} />
      <Route path="/admin/prices" element={withAdminMarket(<AdminPrices />)} />
      <Route path="/admin/coupons" element={withAdminMarket(<AdminCoupons />)} />
    </>
  )
}
