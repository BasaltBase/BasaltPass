import { useEffect, useState } from 'react'
import { setup2FA, verify2FA } from '../../api/security'
import { Link } from 'react-router-dom'

export default function TwoFA() {
  const [secret, setSecret] = useState('')
  const [qr, setQr] = useState('')
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setup2FA().then((res) => {
      setSecret(res.data.secret)
      setQr(res.data.qr)
    })
  }, [])

  const verify = async () => {
    try {
      await verify2FA(code)
      setMsg('2FA enabled!')
    } catch {
      setMsg('Invalid code')
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl mb-4">Two Factor Authentication</h2>
      <Link to="/profile" className="text-blue-600">
        ← Back
      </Link>
      {qr && (
        <div className="my-4">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr)}`} alt="qr" />
          <p className="mt-2">Secret: {secret}</p>
        </div>
      )}
      <div className="flex gap-2 mt-4">
        <input className="border p-2" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter code" />
        <button className="bg-green-600 text-white px-4" onClick={verify}>
          Verify
        </button>
      </div>
      {msg && <p className="mt-2">{msg}</p>}
    </div>
  )
} 