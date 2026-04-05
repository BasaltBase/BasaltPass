import { Route } from 'react-router-dom'
import WalletIndex from '@pages/user/wallet/Index'
import Recharge from '@pages/user/wallet/Recharge'
import Withdraw from '@pages/user/wallet/Withdraw'
import History from '@pages/user/wallet/History'
import Payment from '@pages/user/payment/Payment'
import { withProtected } from '@/routes/helpers'

export function UserWalletRoutes() {
  return (
    <>
      <Route path="/wallet" element={withProtected(<WalletIndex />)} />
      <Route path="/wallet/recharge" element={withProtected(<Recharge />)} />
      <Route path="/wallet/withdraw" element={withProtected(<Withdraw />)} />
      <Route path="/wallet/history" element={withProtected(<History />)} />
      <Route path="/payment" element={withProtected(<Payment />)} />
    </>
  )
}
