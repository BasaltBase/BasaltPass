import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { userAppsApi, UserApp } from '@api/user/apps'
import { Link } from 'react-router-dom'
import { CubeIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline'
import { PSkeleton, PAlert, PEmptyState, PPageHeader, PButton } from '@ui'
import { useI18n } from '@shared/i18n'

export default function UserAppsIndex() {
  const { t, locale } = useI18n()
  const [apps, setApps] = useState<UserApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<number | null>(null)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await userAppsApi.list()
      setApps(data.apps || [])
    } catch (e: any) {
      console.error(e)
      setError(e?.response?.data?.error || t('userAppsIndex.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const revoke = async (app: UserApp) => {
    if (!await uiConfirm(t('userAppsIndex.confirmRevoke', { appName: app.app_name }))) return
    try {
      setRevokingId(app.app_id)
      await userAppsApi.revoke(app.app_id)
      await load()
      uiAlert(t('userAppsIndex.messages.revoked'))
    } catch (e: any) {
      console.error(e)
      uiAlert(e?.response?.data?.error || t('userAppsIndex.errors.revokeFailed'))
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PPageHeader title={t('userAppsIndex.title')} description={t('userAppsIndex.description')} />

        {loading ? (
          <PSkeleton.AppCardGrid count={6} />
        ) : error ? (
          <PAlert variant="error" title={t('userAppsIndex.errors.title')} message={error} actions={[{ label: t('userAppsIndex.actions.retry'), onClick: load }]} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.length === 0 ? (
              <div className="col-span-full">
                <PEmptyState icon={<CubeIcon className="h-12 w-12" />} title={t('userAppsIndex.empty.title')} description={t('userAppsIndex.empty.description')} />
              </div>
            ) : (
              apps.map((app) => (
                <div key={app.id} className="bg-white rounded-lg shadow p-6 flex flex-col">
                  <div className="flex items-center space-x-4">
                    {app.app_icon_url ? (
                      <img src={app.app_icon_url} alt={app.app_name} className="h-12 w-12 rounded" />
                    ) : (
                      <div className="h-12 w-12 rounded bg-blue-50 flex items-center justify-center">
                        <CubeIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="text-lg font-medium text-gray-900">{app.app_name}</div>
                      <div className="text-sm text-gray-500 line-clamp-2">{app.app_description || t('userAppsIndex.dash')}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500 flex items-center space-x-4">
                    <span className="inline-flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" /> {t('userAppsIndex.firstAuthorizedAt', { date: new Date(app.first_authorized_at).toLocaleString(locale) })}
                    </span>
                    <span className="inline-flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1" /> {t('userAppsIndex.lastActiveAt', { date: app.last_active_at ? new Date(app.last_active_at).toLocaleString(locale) : t('userAppsIndex.dash') })}
                    </span>
                  </div>
                  {app.scopes && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-400">{t('userAppsIndex.scopes')}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {app.scopes.split(/[ ,]+/).filter(Boolean).map((s) => (
                          <span key={s} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex items-center justify-between">
                    <Link to={`/my-apps/${app.app_id}`} className="text-sm text-blue-600 hover:text-blue-700">{t('userAppsIndex.actions.viewApp')}</Link>
                    <PButton
                      onClick={() => revoke(app)}
                      disabled={revokingId === app.app_id}
                      loading={revokingId === app.app_id}
                      variant="danger"
                      size="sm"
                      leftIcon={<TrashIcon className="h-4 w-4" />}
                    >
                      {t('userAppsIndex.actions.revoke')}
                    </PButton>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
