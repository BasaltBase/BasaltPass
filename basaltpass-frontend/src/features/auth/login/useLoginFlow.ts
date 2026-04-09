import { useRef, useState, type FormEvent } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import client from '@api/client'
import { loginWithPasskey2FAFlow } from '@api/oauth/passkey'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'
import type { LoginTwoFactorMethod } from './types'

interface UseLoginFlowOptions {
  authRequestTimeout: number
  login: (token: string) => Promise<void>
  navigate: NavigateFunction
  redirectAfterLogin: () => boolean
  resolvedApiBase: string
  siteName: string
}

interface LoginResponse {
  need_2fa?: boolean
  pre_auth_token?: string
  ['2fa_type']?: LoginTwoFactorMethod
  available_2fa_methods?: LoginTwoFactorMethod[]
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

export function useLoginFlow({
  authRequestTimeout,
  login,
  navigate,
  redirectAfterLogin,
  resolvedApiBase,
  siteName,
}: UseLoginFlowOptions) {
  const { t } = useI18n()
  const [step, setStep] = useState(1)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [preAuthToken, setPreAuthToken] = useState('')
  const [twoFAType, setTwoFAType] = useState<LoginTwoFactorMethod>('')
  const [available2FAMethods, setAvailable2FAMethods] = useState<LoginTwoFactorMethod[]>([])
  const [twoFACode, setTwoFACode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const totpInputRef = useRef<HTMLInputElement>(null)

  const resetTwoFactorState = () => {
    setPreAuthToken('')
    setTwoFAType('')
    setAvailable2FAMethods([])
    setTwoFACode('')
    setEmailCode('')
  }

  const submitPasswordLogin = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await client.post<LoginResponse>(
        '/api/v1/auth/login',
        {
          identifier,
          password,
          tenant_id: 0,
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

      setError(t('auth.flow.unknownLoginResponse'))
    } catch (error: unknown) {
      const rawMessage = extractErrorMessage(error)
      const message = rawMessage.toLowerCase()

      if (message.includes('invalid credentials')) {
        setError(t('auth.flow.invalidCredentials'))
        setStep(1)
        setPassword('')
        resetTwoFactorState()
      } else if (message.includes('only administrators can login to platform')) {
        setError(t('auth.flow.onlyAdministratorsAllowed'))
      } else if (extractErrorCode(error) === 'ECONNABORTED' || message.includes('timeout')) {
        setError(t('auth.flow.loginRequestTimeout', { siteName, apiBase: resolvedApiBase }))
      } else {
        setError(rawMessage || t('auth.flow.loginFailedDefault'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const switch2FAMethod = (method: LoginTwoFactorMethod) => {
    setTwoFAType(method)
    setTwoFACode('')
    setEmailCode('')
    setError('')
  }

  const verifySecondFactor = async (totpCode?: string) => {
    if (isLoading) {
      return
    }

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
        payload.code = totpCode ?? twoFACode
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
        setError(t('auth.flow.secondFactorFailed'))
      }
    } catch (error: unknown) {
      const rawMessage = extractErrorMessage(error)
      const message = rawMessage.toLowerCase()

      if (extractErrorCode(error) === 'ECONNABORTED' || message.includes('timeout')) {
        setError(t('auth.flow.secondFactorTimeout', { siteName }))
      } else {
        setError(rawMessage || t('auth.flow.secondFactorFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const submit2FAVerify = async (event: FormEvent) => {
    event.preventDefault()
    await verifySecondFactor()
  }

  const resetToPasswordStep = () => {
    setStep(1)
    setTwoFACode('')
    setEmailCode('')
    setError('')
  }

  return {
    available2FAMethods,
    emailCode,
    error,
    identifier,
    isLoading,
    password,
    rememberMe,
    resetToPasswordStep,
    setEmailCode,
    setError,
    setIdentifier,
    setPassword,
    setRememberMe,
    setShowPassword,
    setTwoFACode,
    showPassword,
    step,
    submit2FAVerify,
    submitPasswordLogin,
    switch2FAMethod,
    totpInputRef,
    twoFACode,
    twoFAType,
    verifySecondFactor,
  }
}
