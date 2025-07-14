import { useState } from 'react'
import { withdraw } from '../../api/wallet'
import { useNavigate } from 'react-router-dom'

export default function Withdraw() {
  const navigate = useNavigate()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await withdraw('USD', Number(amount) * 100)
      navigate('/wallet')
    } catch (e: any) {
      setError(e.response?.data?.error || 'error')
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">Withdraw</h2>
      {error && <p className="text-red-600">{error}</p>}
      <form onSubmit={submit} className="flex gap-2">
        <input className="border p-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="USD" />
        <button className="bg-yellow-600 text-white px-4" type="submit">
          Submit
        </button>
      </form>
    </div>
  )
} 