import { useState, type FormEvent } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import client from '@api/client'
import { loginWithPasskey2FAFlow } from '@api/oauth/passkey'
import { ROUTES } from '@constants'
import type { TenantInfo, TwoFactorMethod } from './types'

interface UseTenantLoginFlowOptions {
  authRequestTimeout: number
  login: (token: string) => Promise<void>
  navigate: NavigateFunction
  redirectAfterLogin: () => boolean
  resolvedApiBase: string
  siteName: string
  tenantInfo: TenantInfo | null
}

interface LoginResponse {
  need_2fa?: boolean
  pre_auth_token?: string
  ['2fa_type']?: TwoFactorMethod
  available_2fa_methods?: string[]
  access_token?: string
}

interface VerifyTwoFactorPayload {
  pre_auth_token: string
  two_fa_type: string
  code?: string
}

function extractErrorMessage(error: unknown) {
  if (typeof error !== 'object' || !error) {
    return ''
  }

  const maybeResponse = 'response' in error ? error.response : null
  const maybeMessage = 'message' in error ? error.message : ''
  const responseData = typeof maybeResponse === 'object' && maybeResponse && 'data' in maybeResponse
    ? maybeResponse.data
    : null

  if (typeof responseData === 'object' && responseData) {
    const fromError = 'error' in responseData ? responseData.error : ''
    const fromMessage = 'message' in responseData ? responseData.message : ''
    return String(fromError || fromMessage || maybeMessage || '')
  }

  return typeof maybeMessage === 'string' ? maybeMessage : ''
}

function extractErrorCode(error: unknown) {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return ''
  }
  return String(error.code || '')
}

export function useTenantLoginFlow({
  authRequestTimeout,
  login,
  navigate,
  redirectAfterLogin,
  resolvedApiBase,
  siteName,
  tenantInfo,
}: UseTenantLoginFlowOptions) {
  const [step, setStep] = useState(1)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [preAuthToken, setPreAuthToken] = useState('')
  const [twoFAType, setTwoFAType] = useState<TwoFactorMethod>('')
  const [available2FAMethods, setAvailable2FAMethods] = useState<TwoFactorMethod[]>([])
  const [twoFACode, setTwoFACode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const resetTwoFactorState = () => {
    setPreAuthToken('')
    setTwoFAType('')
    setAvailable2FAMethods([])
    setTwoFACode('')
    setEmailCode('')
  }

  const submitPasswordLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (!tenantInfo) {
      setError('租户信息加载失败')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await client.post<LoginResponse>(
        '/api/v1/auth/login',
        {
          identifier,
          password,
          tenant_id: tenantInfo.id,
        },
        { timeout: authRequestTimeout },
      )

      if (response.data.need_2fa) {
        setPreAuthToken(response.data.pre_auth_token || '')
        setTwoFAType(response.data['2fa_type'] || '')
        setAvailable2FAMethods(response.data.available_2fa_methods || [])
        setStep(2)
        return
      }

      if (response.data.access_token) {
        await login(response.data.access_token)
        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard)
        }
        return
      }

      setError('未知的登录响应')
    } catch (error: unknown) {
      const rawMessage = extractErrorMessage(error)
      const message = rawMessage.toLowerCase()

      if (message.includes('invalid credentials') || message.includes('invalid email or password')) {
        setError('邮箱或手机号或密码错误')
        setStep(1)
        setPassword('')
        resetTwoFactorState()
      } else if (extractErrorCode(error) === 'ECONNABORTED' || message.includes('timeout')) {
        setError(`登录请求超时：请确认 ${siteName} 后端已运行在 ${resolvedApiBase}`)
      } else {
        setError(rawMessage || '登录失败，请检查您的凭据')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const switch2FAMethod = (method: TwoFactorMethod) => {
    setTwoFAType(method)
    setTwoFACode('')
    setEmailCode('')
    setError('')
  }

  const submit2FAVerify = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (twoFAType === 'passkey') {
        const passkeyResult = await loginWithPasskey2FAFlow(preAuthToken)
        await login(passkeyResult.access_token)
        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard)
        }
        return
      }

      const payload: VerifyTwoFactorPayload = {
        pre_auth_token: preAuthToken,
        two_fa_type: twoFAType,
      }

      if (twoFAType === 'totp') {
        payload.code = twoFACode
      } else if (twoFAType === 'email') {
        payload.code = emailCode
      }

      const response = await client.post<LoginResponse>(
        '/api/v1/auth/verify-2fa',
        payload,
        { timeout: authRequestTimeout },
      )

      if (response.data.access_token) {
        await login(response.data.access_token)
        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard)
        }
      } else {
        setError('验证失败')
      }
    } catch (error: unknown) {
      const rawMessage = extractErrorMessage(error)
      const message = rawMessage.toLowerCase()

      if (extractErrorCode(error) === 'ECONNABORTED' || message.includes('timeout')) {
        setError(`二次验证请求超时：请确认 ${siteName} 后端可访问`)
      } else {
        setError(rawMessage || '验证失败')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return {
    available2FAMethods,
    emailCode,
    error,
    identifier,
    isLoading,
    password,
    preAuthToken,
    rememberMe,
    setEmailCode,
    setError,
    setIdentifier,
    setPassword,
    setRememberMe,
    setShowPassword,
    setStep,
    setTwoFACode,
    showPassword,
    step,
    submit2FAVerify,
    submitPasswordLogin,
    switch2FAMethod,
    twoFACode,
    twoFAType,
  }
}
