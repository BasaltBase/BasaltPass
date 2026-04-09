import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  CubeIcon, 
  KeyIcon, 
  UsersIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi, TenantApp } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'
import CreateOAuthClientModal from '@features/tenant/app/components/CreateOAuthClientModal'
import OAuthClientDetailModal from '@features/tenant/app/components/OAuthClientDetailModal'
import { PButton, PSkeleton, PBadge, PAlert, PCard, PPageHeader } from '@ui'
import type { TenantOAuthClientSummary } from '@api/tenant/tenantApp'
import { useI18n } from '@shared/i18n'

export default function AppDetail() {
  const { t, locale } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<TenantApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showCreateOAuthClientModal, setShowCreateOAuthClientModal] = useState(false)
  const [selectedOAuthClient, setSelectedOAuthClient] = useState<TenantOAuthClientSummary | null>(null)
  const [showOAuthClientDetailModal, setShowOAuthClientDetailModal] = useState(false)

  useEffect(() => {
    if (id) {
      fetchAppDetail()
    }
  }, [id])

  const fetchAppDetail = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      setError('')
      const response = await tenantAppApi.getTenantApp(id)
      setApp(response.data)
    } catch (err: any) {
      console.error(t('tenantAppDetail.logs.loadFailed'), err)
      setError(err.response?.data?.error || t('tenantAppDetail.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error(t('tenantAppDetail.logs.copyFailed'), err)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'error'
      case 'pending': return 'warning'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('tenantAppDetail.status.active')
      case 'inactive':
        return t('tenantAppDetail.status.inactive')
      case 'pending':
        return t('tenantAppDetail.status.pending')
      default:
        return t('tenantAppDetail.status.unknown')
    }
  }

  if (loading && !app) {
    return (
      <TenantLayout title={t('tenantAppDetail.layoutTitle')}>
        <PSkeleton.DetailPage />
      </TenantLayout>
    )
  }

  if (error && !app) {
    return (
      <TenantLayout title={t('tenantAppDetail.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={fetchAppDetail}>
                {t('tenantAppDetail.actions.retry')}
              </PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (!app) {
    return (
      <TenantLayout title={t('tenantAppDetail.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantAppDetail.empty.notFound')}</h3>
            <div className="mt-6">
              <Link
                to={ROUTES.tenant.apps}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
              >
                {t('tenantAppDetail.actions.backToList')}
              </Link>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  const appIdNumberRaw = typeof app.id === 'string' ? parseInt(app.id, 10) : app.id
  const appIdNumber = Number.isFinite(appIdNumberRaw) ? appIdNumberRaw : 0

  return (
    <TenantLayout title={`${app.name} - ${t('tenantAppDetail.layoutTitle')}`}>
      <div className="space-y-6">
        {error && <PAlert variant="error" message={error} className="mb-4" />}

        {/*  */}
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {app.logo_url ? (
                <img
                  className="h-16 w-16 rounded-lg object-cover"
                  src={app.logo_url}
                  alt={app.name}
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                  <CubeIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>
            <div className="ml-6">
              <PPageHeader
                title={app.name}
                description={app.description || t('tenantAppDetail.header.fallbackDescription', { date: new Date(app.created_at).toLocaleDateString(locale), id: app.id })}
              />
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <PBadge variant={getStatusVariant(app.status) as any}>
                  {getStatusText(app.status)}
                </PBadge>
                <span>{t('tenantAppDetail.header.createdAt', { date: new Date(app.created_at).toLocaleDateString(locale) })}</span>
                <span>{t('tenantAppDetail.header.appId', { id: app.id })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to={`/tenant/apps/${app.id}/stats`}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              {t('tenantAppDetail.actions.stats')}
            </Link>
            <Link
              to={`/tenant/apps/${app.id}/settings`}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              {t('tenantAppDetail.actions.settings')}
            </Link>
          </div>
        </div>

        {/*  */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PCard className="overflow-hidden rounded-xl p-5 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantAppDetail.stats.totalUsers')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{app.stats?.total_users || 0}</dd>
                  </dl>
                </div>
              </div>
          </PCard>

          <PCard className="overflow-hidden rounded-xl p-5 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantAppDetail.stats.activeUsers')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{app.stats?.active_users || 0}</dd>
                  </dl>
                </div>
              </div>
          </PCard>

          <PCard className="overflow-hidden rounded-xl p-5 shadow-sm">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantAppDetail.stats.requestsToday')}</dt>
                    <dd className="text-lg font-medium text-gray-900">{app.stats?.requests_today || 0}</dd>
                  </dl>
                </div>
              </div>
          </PCard>
        </div>

        {/*  */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="px-6 py-4 border-b border-blue-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
              {t('tenantAppDetail.accessControl.title')}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {t('tenantAppDetail.accessControl.description')}
            </p>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/*  */}
              <Link
                to={`/tenant/apps/${app.id}/users`}
                className="group relative bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">
                        {t('tenantAppDetail.accessControl.cards.userManagement.title')}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {t('tenantAppDetail.accessControl.cards.userManagement.description')}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {t('tenantAppDetail.accessControl.cards.userManagement.usersCount', { count: app.stats?.total_users || 0 })}
                  </span>
                </div>
              </Link>

              {/*  */}
              <Link
                to={`/tenant/apps/${app.id}/roles`}
                className="group relative bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-green-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon className="h-8 w-8 text-green-600 group-hover:text-green-700" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 group-hover:text-green-900">
                        {t('tenantAppDetail.accessControl.cards.roleManagement.title')}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {t('tenantAppDetail.accessControl.cards.roleManagement.description')}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {t('tenantAppDetail.accessControl.cards.roleManagement.badge')}
                  </span>
                </div>
              </Link>

              {/*  */}
              <Link
                to={`/tenant/apps/${app.id}/permissions`}
                className="group relative rounded-xl border-2 border-gray-200 bg-white p-6 transition-all duration-200 hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <LockClosedIcon className="h-8 w-8 text-indigo-600 group-hover:text-indigo-700" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 group-hover:text-indigo-900">
                        {t('tenantAppDetail.accessControl.cards.permissionManagement.title')}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {t('tenantAppDetail.accessControl.cards.permissionManagement.description')}
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-600" />
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                    {t('tenantAppDetail.accessControl.cards.permissionManagement.badge')}
                  </span>
                </div>
              </Link>
            </div>

            {/*  */}
            <div className="mt-6 pt-4 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{t('tenantAppDetail.quickStart.title')}</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('tenantAppDetail.quickStart.description')}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link
                    to={`/tenant/apps/${app.id}/permissions`}
                    className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white transition-colors hover:bg-indigo-700"
                  >
                    {t('tenantAppDetail.quickStart.createPermission')}
                  </Link>
                  <Link
                    to={`/tenant/apps/${app.id}/roles`}
                    className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-medium leading-4 text-white transition-colors hover:bg-green-700"
                  >
                    {t('tenantAppDetail.quickStart.createRole')}
                  </Link>
                  <Link
                    to={`/tenant/apps/${app.id}/users`}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {t('tenantAppDetail.quickStart.assignPermission')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*  */}
        <PCard className="rounded-xl p-0 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CubeIcon className="h-5 w-5 mr-2 text-blue-500" />
              {t('tenantAppDetail.appInfo.title')}
            </h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantAppDetail.appInfo.name')}</label>
                <p className="mt-1 text-sm text-gray-900">{app.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantAppDetail.appInfo.status')}</label>
                <div className="mt-1">
                  <PBadge variant={getStatusVariant(app.status) as any}>
                    {getStatusText(app.status)}
                  </PBadge>
                </div>
              </div>
              {app.homepage_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('tenantAppDetail.appInfo.homepage')}</label>
                  <a
                    href={app.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {t('tenantAppDetail.appInfo.homepageLink')}
                  </a>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantAppDetail.appInfo.createdAt')}</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(app.created_at).toLocaleString(locale)}</p>
              </div>
            </div>
            {app.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantAppDetail.appInfo.description')}</label>
                <p className="mt-1 text-sm text-gray-900">{app.description}</p>
              </div>
            )}
          </div>
        </PCard>

        {/* OAuth */}
        <PCard className="rounded-xl p-0 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-green-500" />
              {t('tenantAppDetail.oauth.title')}
            </h3>
            <div className="flex items-center gap-3">
              <Link to={ROUTES.tenant.oauthClients} className="text-sm text-blue-600 hover:text-blue-800">
                {t('tenantAppDetail.oauth.goManage')}
              </Link>
              <PButton size="sm" onClick={() => setShowCreateOAuthClientModal(true)}>
                {t('tenantAppDetail.oauth.createClient')}
              </PButton>
            </div>
          </div>
          <div className="px-6 py-4 space-y-4">
            {!app.oauth_clients || app.oauth_clients.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                <KeyIcon className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">{t('tenantAppDetail.oauth.emptyTitle')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('tenantAppDetail.oauth.emptyDescription')}</p>
                <div className="mt-4">
                  <PButton onClick={() => setShowCreateOAuthClientModal(true)}>{t('tenantAppDetail.oauth.createFirstClient')}</PButton>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {app.oauth_clients.map((client) => (
                  <div key={client.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">Client ID</span>
                          <PBadge variant={client.is_active ? 'success' : 'error'}>
                            {client.is_active ? t('tenantAppDetail.status.active') : t('tenantAppDetail.status.inactive')}
                          </PBadge>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <code className="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs font-mono break-all">
                            {client.client_id}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(client.client_id, `oauth_client_id_${client.id}`)}
                            className="inline-flex items-center rounded-lg border border-gray-300 p-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                            title={t('tenantAppDetail.oauth.copyClientId')}
                          >
                            {copiedField === `oauth_client_id_${client.id}` ? (
                              <CheckIcon className="h-4 w-4 text-green-500" />
                            ) : (
                              <ClipboardDocumentIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                          <PButton
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setSelectedOAuthClient(client)
                              setShowOAuthClientDetailModal(true)
                            }}
                            leftIcon={<EyeIcon className="h-4 w-4" />}
                          >
                            {t('tenantAppDetail.oauth.viewDetail')}
                          </PButton>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium text-gray-700">{t('tenantAppDetail.oauth.redirectUris')}</div>
                            <div className="mt-2 space-y-2">
                              {(client.redirect_uris || []).length === 0 ? (
                                <div className="text-sm text-gray-500">{t('tenantAppDetail.oauth.notConfigured')}</div>
                              ) : (
                                (client.redirect_uris || []).map((uri, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono break-all">
                                      {uri}
                                    </code>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(uri, `oauth_redirect_${client.id}_${index}`)}
                                      className="inline-flex items-center rounded-lg border border-gray-300 p-2 text-sm text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                                      title={t('tenantAppDetail.oauth.copyRedirectUri')}
                                    >
                                      {copiedField === `oauth_redirect_${client.id}_${index}` ? (
                                        <CheckIcon className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <ClipboardDocumentIcon className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-medium text-gray-700">Scopes</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(client.scopes || []).length === 0 ? (
                                <span className="text-sm text-gray-500">{t('tenantAppDetail.oauth.notConfigured')}</span>
                              ) : (
                                (client.scopes || []).map((scope) => (
                                  <span key={scope} className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                    {scope}
                                  </span>
                                ))
                              )}
                            </div>

                            <div className="mt-4">
                              <div className="text-sm font-medium text-gray-700">{t('tenantAppDetail.oauth.createdAt')}</div>
                              <div className="mt-1 text-sm text-gray-900">{new Date(client.created_at).toLocaleString(locale)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-500">
                  {t('tenantAppDetail.oauth.secretHint')}
                </div>
              </div>
            )}
          </div>
        </PCard>

        <CreateOAuthClientModal
          isOpen={showCreateOAuthClientModal}
          onClose={() => setShowCreateOAuthClientModal(false)}
          onSuccess={fetchAppDetail}
          apps={[{ id: appIdNumber, name: app.name, description: app.description }]}
          defaultAppId={appIdNumber}
          lockAppSelect
        />

        <OAuthClientDetailModal
          client={selectedOAuthClient}
          isOpen={showOAuthClientDetailModal}
          onClose={() => {
            setShowOAuthClientDetailModal(false)
            setSelectedOAuthClient(null)
          }}
          onUpdate={fetchAppDetail}
        />
      </div>
    </TenantLayout>
  )
}
