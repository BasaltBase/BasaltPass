import { Route } from 'react-router-dom'
import TenantSubscriptionDashboard from '@pages/tenant/subscription/Dashboard'
import TenantProducts from '@pages/tenant/subscription/Products'
import TenantSubscriptions from '@pages/tenant/subscription/Subscriptions'
import TenantSubscriptionDetail from '@pages/tenant/subscription/SubscriptionDetail'
import TenantPlans from '@pages/tenant/subscription/Plans'
import TenantPrices from '@pages/tenant/subscription/Prices'
import TenantCoupons from '@pages/tenant/subscription/Coupons'
import TenantInvoices from '@pages/tenant/subscription/Invoices'
import SubscriptionStatusManagement from '@pages/tenant/subscription/SubscriptionStatusManagement'
import CouponManagement from '@pages/tenant/subscription/CouponManagement'
import PlanManagement from '@pages/tenant/subscription/PlanManagement'
import PriceManagement from '@pages/tenant/subscription/PriceManagement'
import { withTenant, withTenantMarket } from '@/routes/helpers'

export function TenantSubscriptionRoutes() {
  return (
    <>
      <Route path="/tenant/subscriptions" element={withTenantMarket(<TenantSubscriptionDashboard />)} />
      <Route path="/tenant/subscriptions/products" element={withTenantMarket(<TenantProducts />)} />
      <Route path="/tenant/subscriptions/plans" element={withTenantMarket(<TenantPlans />)} />
      <Route path="/tenant/subscriptions/prices" element={withTenantMarket(<TenantPrices />)} />
      <Route path="/tenant/subscriptions/subscriptions" element={withTenantMarket(<TenantSubscriptions />)} />
      <Route path="/tenant/subscriptions/detail/:id" element={withTenantMarket(<TenantSubscriptionDetail />)} />
      <Route path="/tenant/subscriptions/coupons" element={withTenantMarket(<TenantCoupons />)} />
      <Route path="/tenant/subscriptions/invoices" element={withTenantMarket(<TenantInvoices />)} />
      <Route path="/tenant/subscription-status" element={withTenant(<SubscriptionStatusManagement />)} />
      <Route path="/tenant/coupons" element={withTenant(<CouponManagement />)} />
      <Route path="/tenant/plans" element={withTenant(<PlanManagement />)} />
      <Route path="/tenant/prices" element={withTenant(<PriceManagement />)} />
    </>
  )
}
