import { useCallback, useEffect } from 'react'
import client from '@api/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { useConfig } from '@contexts/ConfigContext'
import { getApiBase, getAuthRequestTimeoutMs } from '../../shared/config/env'
import { resolveSafeRedirectTarget } from '@utils/redirect'
import { consumeSessionNotice } from '@utils/sessionNotice'
import { PAlert } from '@ui'
import { useI18n } from '@shared/i18n'
import { LoginPasswordForm } from './login/LoginPasswordForm'
import { LoginShell } from './login/LoginShell'
import { LoginTwoFactorForm } from './login/LoginTwoFactorForm'
import { useLoginFlow } from './login/useLoginFlow'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { siteName, siteInitial, setPageTitle } = useConfig()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()

  const redirectParam = searchParams.get('redirect') || ''
  const authRequestTimeout = getAuthRequestTimeoutMs()
  const resolvedApiBase = String(client.defaults.baseURL || getApiBase()).replace(/\/$/, '')

  const redirectAfterLogin = useCallback(() => {
    const target = resolveSafeRedirectTarget(redirectParam, resolvedApiBase)
    if (!target) {
      return false
    }

    window.location.href = target
    return true
  }, [redirectParam, resolvedApiBase])

  const {
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
  } = useLoginFlow({
    authRequestTimeout,
    login,
    navigate,
    redirectAfterLogin,
    resolvedApiBase,
    siteName,
  })

  useEffect(() => {
    setPageTitle(t('auth.login.pageTitleAdmin'))
  }, [setPageTitle, t])

  useEffect(() => {
    const code = consumeSessionNotice()
    if (code === 'session_expired') {
      setError(t('entry.adminSessionExpired'))
      return
    }
    if (code) {
      setError(t(`sessionNotice.${code}`))
    }
  }, [setError, t])

  useEffect(() => {
    if (step === 2 && twoFAType === 'totp') {
      totpInputRef.current?.focus()
    }
  }, [step, twoFAType, totpInputRef])

  return (
    <LoginShell siteInitial={siteInitial} siteName={siteName}>
      {error && step === 1 && (
        <div className="mt-6">
          <PAlert variant="error" title={t('auth.login.errorTitle')} message={error} />
        </div>
      )}

      {step === 1 && (
        <LoginPasswordForm
          identifier={identifier}
          isLoading={isLoading}
          password={password}
          rememberMe={rememberMe}
          setIdentifier={setIdentifier}
          setPassword={setPassword}
          setRememberMe={setRememberMe}
          setShowPassword={setShowPassword}
          showPassword={showPassword}
          submitPasswordLogin={submitPasswordLogin}
        />
      )}

      {step === 2 && (
        <LoginTwoFactorForm
          available2FAMethods={available2FAMethods}
          emailCode={emailCode}
          error={error}
          isLoading={isLoading}
          resetToPasswordStep={resetToPasswordStep}
          setEmailCode={setEmailCode}
          setTwoFACode={setTwoFACode}
          submit2FAVerify={submit2FAVerify}
          switch2FAMethod={switch2FAMethod}
          totpInputRef={totpInputRef}
          twoFACode={twoFACode}
          twoFAType={twoFAType}
          verifySecondFactor={verifySecondFactor}
        />
      )}
    </LoginShell>
  )
}

export default Login
