import { useEffect, useState } from 'react'
import { listWallets, approveTx } from '../../api/admin'
import { Link } from 'react-router-dom'

interface Tx {
  id: number
  wallet_id: number
  type: string
  amount: number
  status: string
  created_at: string
}

export default function Wallets() {
  const [txs, setTxs] = useState<Tx[]>([])

  const load = () => {
    listWallets().then((r) => setTxs(r.data))
  }
  useEffect(load, [])

  const approve = async (t: Tx, status: 'success' | 'fail') => {
    await approveTx(t.id, status)
    load()
  }

  return (
    <div className="p-8 overflow-x-auto">
      <h2 className="text-2xl mb-4">Wallet Transactions</h2>
      <Link to="/admin" className="text-blue-600">
        ← Back
      </Link>
      <table className="min-w-full border mt-4">
        <thead>
          <tr>
            <th className="border px-2">ID</th>
            <th className="border px-2">Type</th>
            <th className="border px-2">Amount</th>
            <th className="border px-2">Status</th>
            <th className="border px-2">Time</th>
            <th className="border px-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {txs.map((t) => (
            <tr key={t.id}>
              <td className="border px-2">{t.id}</td>
              <td className="border px-2">{t.type}</td>
              <td className="border px-2">{t.amount / 100}</td>
              <td className="border px-2">{t.status}</td>
              <td className="border px-2">{new Date(t.created_at).toLocaleString()}</td>
              <td className="border px-2 space-x-2">
                {t.status === 'pending' && (
                  <>
                    <button className="bg-green-600 text-white px-2" onClick={() => approve(t, 'success')}>
                      ✔
                    </button>
                    <button className="bg-red-600 text-white px-2" onClick={() => approve(t, 'fail')}>
                      ✖
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 