import { Route } from 'react-router-dom'
import SubscriptionIndex from '@pages/user/subscription/Index'
import ProductsPage from '@pages/user/subscription/Products'
import SubscriptionCheckout from '@pages/user/subscription/Checkout'
import OrderConfirm from '@pages/user/order/OrderConfirm'
import OrderSuccess from '@pages/user/order/OrderSuccess'
import { withProtected, withProtectedMarket } from '@/routes/helpers'

export function UserCommerceRoutes() {
  return (
    <>
      <Route path="/products" element={withProtectedMarket(<ProductsPage />)} />
      <Route path="/subscriptions" element={withProtectedMarket(<SubscriptionIndex />)} />
      <Route path="/subscriptions/checkout" element={withProtectedMarket(<SubscriptionCheckout />)} />
      <Route path="/orders/:orderId/confirm" element={withProtected(<OrderConfirm />)} />
      <Route path="/orders/:orderId/success" element={withProtected(<OrderSuccess />)} />
    </>
  )
}
