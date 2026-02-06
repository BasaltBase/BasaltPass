import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { setAccessToken } from '@utils/auth'
import { ROUTES } from '@constants'

export default function OauthSuccess() {
  const [params] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      setAccessToken(token)
      navigate(ROUTES.user.profile)
    } else {
      navigate(ROUTES.user.login)
    }
  }, [params, navigate])

  return null
} 