import { useEffect, useState } from 'react'
import { getBalance } from '../../api/wallet'
import { Link } from 'react-router-dom'

export default function WalletIndex() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    getBalance('USD').then((res) => setBalance(res.data.balance))
  }, [])

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">Wallet</h2>
      {balance !== null && <p className="mb-4">Balance: ${balance / 100}</p>}
      <div className="flex gap-4">
        <Link className="bg-blue-600 text-white px-4 py-2" to="/wallet/recharge">
          Recharge
        </Link>
        <Link className="bg-yellow-600 text-white px-4 py-2" to="/wallet/withdraw">
          Withdraw
        </Link>
        <Link className="bg-gray-600 text-white px-4 py-2" to="/wallet/history">
          History
        </Link>
      </div>
    </div>
  )
} 