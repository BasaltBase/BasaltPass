import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setAccessToken } from '@utils/auth'
import { ROUTES } from '@constants'
import client from '@api/client'

export default function OauthSuccess() {
  const navigate = useNavigate()

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await client.post('/api/v1/auth/refresh')
        const token = res.data?.access_token
        if (!token) {
          throw new Error('missing access token')
        }
        setAccessToken(token)
        navigate(ROUTES.user.profile)
      } catch {
        navigate(ROUTES.user.login)
      }
    }
    void bootstrap()
  }, [navigate])

  return null
} 
