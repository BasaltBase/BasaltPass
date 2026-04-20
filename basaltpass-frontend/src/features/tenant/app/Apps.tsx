import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CubeIcon,
  KeyIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi, TenantApp } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'
import { PSkeleton, PBadge, PAlert, PPageHeader, PEmptyState, PButton } from '@ui'
import { useI18n } from '@shared/i18n'

const actionButtonClass =
  'inline-flex items-center rounded-lg border p-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2'

export default function TenantAppList() {
  const { t, locale } = useI18n()
  const [apps, setApps] = useState<TenantApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      setLoading(true)
      const response = await tenantAppApi.listTenantApps()
      setApps(response.data?.apps || [])
    } catch (err: any) {
      console.error(t('tenantAppList.logs.loadFailed'), err)
      setError(err.response?.data?.error || t('tenantAppList.errors.loadFailed'))
    } finally {
      setLoading(false)
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
        return t('tenantAppList.status.active')
      case 'inactive':
        return t('tenantAppList.status.inactive')
      case 'pending':
        return t('tenantAppList.status.pending')
      case 'deleted':
        return t('tenantAppList.status.deleted')
      default:
        return t('tenantAppList.status.unknown')
    }
  }

  const handleToggleStatus = async (appId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      await tenantAppApi.toggleAppStatus(appId, newStatus)
      // 
      fetchApps()
    } catch (err: any) {
      console.error(t('tenantAppList.logs.toggleFailed'), err)
      uiAlert(t('tenantAppList.errors.toggleFailed'))
    }
  }

  const handleDeleteApp = async (appId: string) => {
    if (await uiConfirm(t('tenantAppList.confirmDelete'))) {
      try {
        await tenantAppApi.deleteTenantApp(appId)
        // 
        fetchApps()
      } catch (err: any) {
        console.error(t('tenantAppList.logs.deleteFailed'), err)
        uiAlert(t('tenantAppList.errors.deleteFailed'))
      }
    }
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantAppList.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantAppList.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={fetchApps}>{t('tenantAppList.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantAppList.layoutTitle')}>
      <div className="space-y-6">
        {/*  */}
        <PPageHeader
          title={t('tenantAppList.title')}
          description={t('tenantAppList.description')}
          icon={<CubeIcon className="h-8 w-8 text-blue-600" />}
          actions={
            <Link to={ROUTES.tenant.appsNew}>
              <PButton leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppList.actions.createApp')}</PButton>
            </Link>
          }
        />

        {/*  */}
        {error && <PAlert variant="error" message={error} className="mb-6" />}

        {/*  */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {apps.map((app) => (
              <li key={app.id}>
                <div className="px-6 py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center">
                        <div className="flex-shrink-0">
                          {app.logo_url ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={app.logo_url}
                              alt={app.name}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
                              <CubeIcon className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <Link
                              to={`/tenant/apps/${app.id}`}
                              className="text-lg font-medium text-gray-900 hover:text-blue-600 truncate"
                            >
                              {app.name}
                            </Link>
                            <PBadge variant={getStatusVariant(app.status) as any} className="ml-3">
                              {getStatusText(app.status)}
                            </PBadge>
                            {app.oauth_client && (
                              <PBadge variant="info" className="ml-2" icon={<KeyIcon className="h-3 w-3" />}>
                                {t('tenantAppList.oauthConfigured')}
                              </PBadge>
                            )}
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-600 truncate">
                              {app.description}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center text-sm gap-y-1 text-gray-500">
                            {app.homepage_url && (
                              <>
                                <a
                                  href={app.homepage_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {t('tenantAppList.homepage')}
                                </a>
                                <span className="mx-2">•</span>
                              </>
                            )}
                            <span>{t('tenantAppList.createdAt', { date: new Date(app.created_at).toLocaleDateString(locale) })}</span>
                            {app.last_accessed && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{t('tenantAppList.lastAccessed', { date: new Date(app.last_accessed).toLocaleDateString(locale) })}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                              <span>{t('tenantAppList.stats.totalUsers')}: <span className="font-medium text-gray-900">{app.stats?.total_users || 0}</span></span>
                              <span>{t('tenantAppList.stats.activeUsers')}: <span className="font-medium text-green-600">{app.stats?.active_users || 0}</span></span>
                              <span>{t('tenantAppList.stats.requestsToday')}: <span className="font-medium text-blue-600">{app.stats?.requests_today || 0}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(app.id, app.status)}
                        className={`${actionButtonClass} ${
                          app.status === 'active'
                            ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500'
                            : 'border-green-300 text-green-700 bg-white hover:bg-green-50 focus:ring-green-500'
                        }`}
                        title={app.status === 'active' ? t('tenantAppList.actions.stopApp') : t('tenantAppList.actions.startApp')}
                      >
                        {app.status === 'active' ? (
                          <StopIcon className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </button>
                      <Link
                        to={`/tenant/apps/${app.id}/users`}
                        className={`${actionButtonClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.userPermissionManagement')}
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/roles`}
                        className={`${actionButtonClass} border-green-300 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500`}
                        title={t('tenantAppList.actions.roleManagement')}
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.viewDetail')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/stats`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.stats')}
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/settings`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.settings')}
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className={`${actionButtonClass} border-red-300 bg-white text-red-700 hover:bg-red-50 focus:ring-red-500`}
                        title={t('tenantAppList.actions.delete')}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/*  */}
          {apps.length === 0 && !loading && (
            <PEmptyState
              icon={CubeIcon}
              title={t('tenantAppList.empty.title')}
              description={t('tenantAppList.empty.description')}
            >
              <Link to={ROUTES.tenant.appsNew}>
                <PButton leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppList.actions.createApp')}</PButton>
              </Link>
            </PEmptyState>
          )}
        </div>

        {/*  -  */}
        {apps.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                {t('tenantAppList.pagination.previous')}
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                {t('tenantAppList.pagination.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  {t('tenantAppList.pagination.summary', { to: apps.length, total: apps.length })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
