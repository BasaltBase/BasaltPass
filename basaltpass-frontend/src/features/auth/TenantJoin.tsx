import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import client from '@api/client'
import PSkeleton from '@ui/PSkeleton'
import { PAlert, PButton } from '@ui'
import { ROUTES } from '@constants'
import { useAuth } from '@contexts/AuthContext'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'
import { TenantLoginShell } from './tenant-login/TenantLoginShell'
import { useTenantInfo } from './tenant-login/useTenantInfo'

function TenantJoin() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const { isAuthenticated, isLoading: isAuthLoading, checkAuth } = useAuth()
  const { setPageTitle } = useConfig()
  const { t } = useI18n()

  const [tenantLoadError, setTenantLoadError] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)
  const [joinSuccess, setJoinSuccess] = useState(false)
  const [alreadyJoined, setAlreadyJoined] = useState(false)
  const [attemptedAutoJoin, setAttemptedAutoJoin] = useState(false)

  const { tenantInfo, loadingTenant } = useTenantInfo({
    tenantCode,
    setPageTitle,
    onError: setTenantLoadError,
  })

  const loginRedirectHref = (() => {
    if (typeof window === 'undefined') {
      return ROUTES.user.login
    }
    const fullPath = `${window.location.pathname}${window.location.search}`
    return `${ROUTES.user.login}?redirect=${encodeURIComponent(fullPath)}`
  })()

  const joinTenant = useCallback(async () => {
    if (!tenantCode || joining) {
      return
    }

    setJoining(true)
    setJoinError('')

    try {
      const res = await client.post(`/api/v1/user/tenants/join-by-code/${encodeURIComponent(tenantCode)}`)
      setAlreadyJoined(Boolean(res?.data?.already_joined))
      setJoinSuccess(true)
      await checkAuth()
    } catch (err: any) {
      setJoinSuccess(false)
      setJoinError(err?.response?.data?.error || t('auth.tenantJoin.errors.joinFailed'))
    } finally {
      setJoining(false)
    }
  }, [checkAuth, joining, t, tenantCode])

  useEffect(() => {
    if (!isAuthenticated || isAuthLoading || !tenantInfo || attemptedAutoJoin) {
      return
    }

    setAttemptedAutoJoin(true)
    void joinTenant()
  }, [attemptedAutoJoin, isAuthLoading, isAuthenticated, joinTenant, tenantInfo])

  if (loadingTenant || isAuthLoading) {
    return <PSkeleton.PageLoader message={t('auth.tenant.loadingTenantInfo')} />
  }

  if (!tenantInfo && !loadingTenant) {
    return (
      <TenantLoginShell
        subtitle={t('auth.tenant.subtitle')}
        title={t('auth.tenant.notFoundTitle')}
        description={<>{tenantLoadError || t('auth.tenant.notFoundDescription')}</>}
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

  if (!isAuthenticated) {
    return (
      <TenantLoginShell
        subtitle={t('auth.tenant.subtitle')}
        title={t('auth.tenantJoin.loginRequired.title')}
        description={
          <>
            {t('auth.tenantJoin.loginRequired.descriptionPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span> {t('auth.tenantJoin.loginRequired.descriptionSuffix')}
          </>
        }
        tenantCode={tenantCode}
        tenantInfo={tenantInfo}
      >
        <div className="mt-6 space-y-3">
          <Link to={loginRedirectHref}>
            <PButton type="button" variant="primary" fullWidth>
              {t('auth.tenantJoin.actions.loginToJoin')}
            </PButton>
          </Link>
          <div className="text-center text-sm text-gray-600">
            <Link to={`/auth/tenant/${tenantCode}/login`} className="text-blue-600 hover:text-blue-500">
              {t('auth.tenantJoin.actions.goTenantLogin')}
            </Link>
          </div>
        </div>
      </TenantLoginShell>
    )
  }

  return (
    <TenantLoginShell
      subtitle={t('auth.tenant.subtitle')}
      title={joinSuccess ? t('auth.tenantJoin.success.title') : t('auth.tenantJoin.title')}
      description={
        joinSuccess ? (
          alreadyJoined ? (
            <>
              {t('auth.tenantJoin.success.alreadyJoinedPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span> {t('auth.tenantJoin.success.alreadyJoinedSuffix')}
            </>
          ) : (
            <>
              {t('auth.tenantJoin.success.joinedPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span> {t('auth.tenantJoin.success.joinedSuffix')}
            </>
          )
        ) : (
          <>
            {t('auth.tenantJoin.descriptionPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span> {t('auth.tenantJoin.descriptionSuffix')}
          </>
        )
      }
      tenantCode={tenantCode}
      tenantInfo={tenantInfo}
    >
      <div className="mt-6 space-y-4">
        {joinError ? <PAlert variant="error" title={t('auth.tenantJoin.errors.title')} message={joinError} /> : null}

        {!joinSuccess ? (
          <PButton type="button" onClick={() => void joinTenant()} loading={joining} fullWidth>
            {joining ? t('auth.tenantJoin.actions.joining') : t('auth.tenantJoin.actions.joinNow')}
          </PButton>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link to={`/auth/tenant/${tenantCode}/login`}>
            <PButton type="button" variant="secondary" fullWidth>
              {t('auth.tenantJoin.actions.goTenantLogin')}
            </PButton>
          </Link>
          <Link to={ROUTES.user.dashboard}>
            <PButton type="button" variant="secondary" fullWidth>
              {t('auth.tenantJoin.actions.goUserDashboard')}
            </PButton>
          </Link>
        </div>
      </div>
    </TenantLoginShell>
  )
}

export default TenantJoin
