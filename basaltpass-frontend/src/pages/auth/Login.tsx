import { useState } from 'react'
import client from '../../api/client'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await client.post('/api/v1/auth/login', {
        identifier,
        password,
      })
      setAccessToken(res.data.access_token)
      navigate('/profile')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="flex flex-col items-center mt-20">
      <h2 className="text-2xl mb-4">Login</h2>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      <form onSubmit={submit} className="flex flex-col gap-2 w-72">
        <input
          className="border p-2"
          placeholder="Email or Phone"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <input
          className="border p-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="bg-blue-600 text-white py-2" type="submit">
          Login
        </button>
      </form>
      <button
        className="bg-red-500 text-white py-2 mt-2"
        type="button"
        onClick={() => (window.location.href = `${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api/v1/auth/oauth/google/login`)}
      >
        Login with Google
      </button>
    </div>
  )
}

export default Login 