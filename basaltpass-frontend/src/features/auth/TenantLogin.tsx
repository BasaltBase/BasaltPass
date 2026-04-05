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
import { consumeSessionNotice, getSessionNoticeMessage } from '@utils/sessionNotice'
import { PAlert } from '@ui'
import { TenantLoginShell } from './tenant-login/TenantLoginShell'
import { TenantPasswordLoginForm } from './tenant-login/TenantPasswordLoginForm'
import { TenantTwoFactorForm } from './tenant-login/TenantTwoFactorForm'
import { useTenantInfo } from './tenant-login/useTenantInfo'
import { useTenantLoginFlow } from './tenant-login/useTenantLoginFlow'
import { useTenantSessionBootstrap } from './tenant-login/useTenantSessionBootstrap'

/**
 * 租户专属登录页面
 * 用户通过 /auth/tenant/:tenantCode/login 访问此页面
 * 该页面会自动带上租户信息进行登录
 */
function TenantLogin() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { siteName, setPageTitle } = useConfig()
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
    const message = getSessionNoticeMessage(consumeSessionNotice())
    if (message) {
      setError(message === '当前登录会话已过期，请重新登录。' ? '当前登录会话已过期，请重新登录后再进入租户控制台。' : message)
    }
  }, [setError])

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
      <PSkeleton.PageLoader message={loadingTenant ? "正在加载租户信息..." : "正在检查租户登录状态..."} />
    )
  }

  if (!tenantInfo && !loadingTenant) {
    return (
      <TenantLoginShell
        subtitle="租户登录"
        title="租户不存在"
        description={<>该租户不存在或已被禁用，请检查您的访问链接。</>}
        tenantCode={tenantCode}
        tenantInfo={tenantInfo}
      >
        <div className="mt-6">
        <Link to={ROUTES.user.login} className="font-medium text-blue-600 hover:text-blue-500">
          返回平台登录
        </Link>
        </div>
      </TenantLoginShell>
    )
  }

  return (
    <TenantLoginShell
      subtitle="租户登录"
      title="欢迎回来"
      description={
        <>
          使用邮箱或手机号登录，继续访问 <span className="font-medium text-gray-900">{tenantInfo?.name}</span>。
        </>
      }
      tenantCode={tenantCode}
      tenantInfo={tenantInfo}
    >
        {displayError && <div className="mt-6"><PAlert variant="error" title="登录失败" message={displayError} /></div>}
        {hasTenantMismatch && (
            <div className="mt-6">
              <PAlert
                variant="info"
                title="检测到其他租户会话"
                message="当前浏览器已登录其他租户账户。只有当前会话属于本租户时才会视为已登录；你仍然可以继续登录这个租户。"
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
            注册新账户
          </Link>
          <Link to={ROUTES.user.login} className="text-blue-600 hover:text-blue-500">
            使用平台账号登录
          </Link>
        </div>
    </TenantLoginShell>
  )
}

export default TenantLogin
