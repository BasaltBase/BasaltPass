import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@constants'
import client from '@api/client'
import { useAuth } from '@contexts/AuthContext'

export default function OauthSuccess() {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await client.post('/api/v1/auth/refresh')
        const token = res.data?.access_token
        if (!token) {
          throw new Error('missing access token')
        }
        await login(token)
        navigate(ROUTES.user.profile)
      } catch {
        navigate(ROUTES.user.login)
      }
    }
    void bootstrap()
  }, [login, navigate])

  return null
} 
