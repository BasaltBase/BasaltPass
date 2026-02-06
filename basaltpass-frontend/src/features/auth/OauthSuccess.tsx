import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setAccessToken } from '@utils/auth'

export default function OauthSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      setAccessToken(token)
      navigate('/profile')
    } else {
      navigate('/login')
    }
  }, [params, navigate])

  return null
} 