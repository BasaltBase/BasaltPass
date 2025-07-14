import { useEffect, useState } from 'react'
import { history } from '../../api/wallet'
import { Link } from 'react-router-dom'

interface Tx {
  id: number
  type: string
  amount: number
  status: string
  created_at: string
}

export default function History() {
  const [txs, setTxs] = useState<Tx[]>([])

  useEffect(() => {
    history('USD').then((res) => setTxs(res.data))
  }, [])

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">History</h2>
      <Link className="text-blue-600" to="/wallet">
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
} 