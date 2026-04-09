import { useCallback, useEffect, useMemo, useState } from 'react'
import PSkeleton from '@ui/PSkeleton'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@constants'
import client from '@api/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { useConfig } from '@contexts/ConfigContext'
import { getApiBase, getAuthRequestTimeoutMs } from '../../shared/config/env'
import { resolveSafeRedirectTarget } from '@utils/redirect'
import { decodeJWT } from '@utils/jwt'
import { getAccessToken } from '@utils/auth'
import { consumeSessionNotice } from '@utils/sessionNotice'
import { PAlert } from '@ui'
import { useI18n } from '@shared/i18n'
import { TenantLoginShell } from './tenant-login/TenantLoginShell'
import { TenantPasswordLoginForm } from './tenant-login/TenantPasswordLoginForm'
import { TenantTwoFactorForm } from './tenant-login/TenantTwoFactorForm'
import { useTenantInfo } from './tenant-login/useTenantInfo'
import { useTenantLoginFlow } from './tenant-login/useTenantLoginFlow'
import { useTenantSessionBootstrap } from './tenant-login/useTenantSessionBootstrap'

/**
 * Tenant-specific sign-in page
 * Users access this page via /auth/tenant/:tenantCode/login
 * Tenant context is automatically attached during sign-in
 */
function TenantLogin() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { siteName, setPageTitle } = useConfig()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [tenantLoadError, setTenantLoadError] = useState('')

  const redirectParam = searchParams.get('redirect') || ''
  const authRequestTimeout = getAuthRequestTimeoutMs()
  const resolvedApiBase = String(client.defaults.baseURL || getApiBase()).replace(/\/$/, '')

  const redirectAfterLogin = useCallback(() => {
    const target = resolveSafeRedirectTarget(redirectParam, resolvedApiBase)
    if (!target) return false

    window.location.href = target
    return true
  }, [redirectParam, resolvedApiBase])

  const {
    tenantInfo,
    loadingTenant,
  } = useTenantInfo({
    tenantCode,
    setPageTitle,
    onError: setTenantLoadError,
  })

  const {
    available2FAMethods,
    emailCode,
    error,
    identifier,
    isLoading,
    password,
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
  } = useTenantLoginFlow({
    authRequestTimeout,
    login,
    navigate,
    redirectAfterLogin,
    resolvedApiBase,
    siteName,
    tenantInfo,
  })

  const { isResolvingTenantSession } = useTenantSessionBootstrap({
    isAuthenticated,
    isAuthLoading,
    login,
    navigate,
    redirectAfterLogin,
    tenantInfo,
  })

  useEffect(() => {
    const code = consumeSessionNotice()
    if (code === 'session_expired') {
      setError(t('entry.tenantSessionExpired'))
      return
    }
    if (code) {
      setError(t(`sessionNotice.${code}`))
    }
  }, [setError, t])

  const displayError = tenantLoadError || error
  const hasTenantMismatch = useMemo(() => {
    if (!tenantInfo || isAuthLoading || !isAuthenticated) {
      return false
    }

    const token = getAccessToken()
    const decoded = token ? decodeJWT(token) : null
    const currentTenantID = Number(decoded?.tid || 0)
    const currentScope = String(decoded?.scp || 'user')

    return currentScope === 'user' && currentTenantID > 0 && currentTenantID !== tenantInfo.id
  }, [isAuthenticated, isAuthLoading, tenantInfo])

  if (loadingTenant || isResolvingTenantSession) {
    return (
      <PSkeleton.PageLoader message={loadingTenant ? t('auth.tenant.loadingTenantInfo') : t('auth.tenant.loadingTenantSession')} />
    )
  }

  if (!tenantInfo && !loadingTenant) {
    return (
      <TenantLoginShell
        subtitle={t('auth.tenant.subtitle')}
        title={t('auth.tenant.notFoundTitle')}
        description={<>{t('auth.tenant.notFoundDescription')}</>}
        tenantCode={tenantCode}
        tenantInfo={tenantInfo}
      >
        <div className="mt-6">
        <Link to={ROUTES.user.login} className="font-medium text-blue-600 hover:text-blue-500">
          {t('auth.tenant.backToPlatformLogin')}
        </Link>
        </div>
      </TenantLoginShell>
    )
  }

  return (
    <TenantLoginShell
      subtitle={t('auth.tenant.subtitle')}
      title={t('auth.shell.welcomeBack')}
      description={
        <>
          {t('auth.tenant.welcomeDescriptionPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span>{t('auth.tenant.welcomeDescriptionSuffix')}
        </>
      }
      tenantCode={tenantCode}
      tenantInfo={tenantInfo}
    >
        {displayError && <div className="mt-6"><PAlert variant="error" title={t('auth.login.errorTitle')} message={displayError} /></div>}
        {hasTenantMismatch && (
            <div className="mt-6">
              <PAlert
                variant="info"
                title={t('auth.tenant.mismatchTitle')}
                message={t('auth.tenant.mismatchMessage')}
              />
            </div>
        )}

        {step === 1 && (
          <TenantPasswordLoginForm
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
          <TenantTwoFactorForm
            available2FAMethods={available2FAMethods}
            emailCode={emailCode}
            error={error}
            isLoading={isLoading}
            setEmailCode={setEmailCode}
            setStep={setStep}
            setTwoFACode={setTwoFACode}
            submit2FAVerify={submit2FAVerify}
            switch2FAMethod={switch2FAMethod}
            twoFACode={twoFACode}
            twoFAType={twoFAType}
          />
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <Link 
            to={`/auth/tenant/${tenantCode}/register`}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {t('auth.tenant.registerNewAccount')}
          </Link>
          <Link to={ROUTES.user.login} className="text-blue-600 hover:text-blue-500">
            {t('auth.tenant.usePlatformLogin')}
          </Link>
        </div>
    </TenantLoginShell>
  )
}

export default TenantLogin
