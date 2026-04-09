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
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { appApi, App } from '@api/admin/app'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { ROUTES } from '@constants'
import { PSkeleton, PBadge, PAlert, PPageHeader, PPagination, PButton } from '@ui'
import { useI18n } from '@shared/i18n'

const actionButtonClass =
  'inline-flex items-center rounded-lg border p-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2'

export default function AppList() {
  const { t, locale } = useI18n()
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadApps()
  }, [page])

  const loadApps = async () => {
    try {
      setLoading(true)
      const response = await appApi.listApps(page, 20)
      setApps(response.apps || [])
      setTotalPages(response.total_pages || 1)
    } catch (error) {
      console.error('Failed to load apps:', error)
      setError(t('tenantAppList.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteApp = async (id: string) => {
    if (!await uiConfirm(t('tenantAppList.confirmDelete'))) {
      return
    }

    try {
      await appApi.deleteApp(id)
      await loadApps()
    } catch (error) {
      console.error('Failed to delete app:', error)
      uiAlert(t('tenantAppList.errors.deleteFailed'))
    }
  }

  const getStatusVariant = (status: string): 'success' | 'error' | 'default' => {
    switch (status) {
      case 'active': return 'success'
      case 'suspended': return 'error'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('tenantAppList.status.active')
      case 'inactive':
        return t('tenantAppList.status.inactive')
      case 'suspended':
        return t('tenantAppList.status.suspended')
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="py-6">
        <PSkeleton.Management />
      </div>
    )
  }

  return (
    <TenantLayout title={t('tenantAppList.layoutTitle')}>
      <div className="space-y-6">
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

        {error && <PAlert variant="error" message={error} className="mb-6" />}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {apps.map((app) => (
              <li key={app.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {app.logo_url ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={app.logo_url}
                              alt={app.name}
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                              <CubeIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {app.name}
                            </h3>
                            <PBadge variant={getStatusVariant(app.status)} className="ml-3">
                              {getStatusText(app.status)}
                            </PBadge>
                            {app.oauth_client && (
                              <PBadge variant="info" className="ml-2">
                                <KeyIcon className="h-3 w-3 mr-1" />
                                {t('tenantAppList.oauthConfigured')}
                              </PBadge>
                            )}
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-600 truncate">
                              {app.description}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            {app.homepage_url && (
                              <>
                                <a
                                  href={app.homepage_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  {t('tenantAppList.homepage')}
                                </a>
                                <span className="mx-2">•</span>
                              </>
                            )}
                            <span>{t('tenantAppList.createdAt', { date: new Date(app.created_at).toLocaleDateString(locale) })}</span>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">{t('tenantAppList.callbackUrlsLabel')}</span>
                              {app.callback_urls.length > 0 ? (
                                <span className="ml-1">
                                  {app.callback_urls.slice(0, 2).join(', ')}
                                  {app.callback_urls.length > 2 && t('tenantAppList.moreCount', { count: app.callback_urls.length - 2 })}
                                </span>
                              ) : (
                                <span className="ml-1 text-gray-400">{t('tenantAppList.notConfigured')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/tenant/apps/${app.id}`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.viewDetail')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/edit`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.edit')}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/oauth`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title={t('tenantAppList.actions.oauthConfig')}
                      >
                        <KeyIcon className="h-4 w-4" />
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

          {apps.length === 0 && !loading && (
            <div className="text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantAppList.empty.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('tenantAppList.empty.description')}</p>
              <div className="mt-6">
                <Link to={ROUTES.tenant.appsNew}>
                  <PButton leftIcon={<PlusIcon className="h-4 w-4" />}>{t('tenantAppList.actions.createApp')}</PButton>
                </Link>
              </div>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <PPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </TenantLayout>
  )
}
