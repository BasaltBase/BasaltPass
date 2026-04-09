import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { userAppsApi, UserApp } from '@api/user/apps'
import { PCard, PSkeleton, PAlert, PButton } from '@ui'
import { useI18n } from '@shared/i18n'
import { 
  ArrowLeftIcon, 
  CubeIcon, 
  ClockIcon, 
  TrashIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function UserAppDetail() {
  const { t, locale } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<UserApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await userAppsApi.list()
      const foundApp = data.apps?.find((a: UserApp) => a.app_id === Number(id))
      if (foundApp) {
        setApp(foundApp)
      } else {
        setError(t('userAppDetail.errors.notFoundOrUnauthorized'))
      }
    } catch (e: any) {
      console.error(e)
      setError(e?.response?.data?.error || t('userAppDetail.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const revoke = async () => {
    if (!app || !await uiConfirm(t('userAppDetail.confirmRevoke', { appName: app.app_name }))) return
    try {
      setRevoking(true)
      await userAppsApi.revoke(app.app_id)
      uiAlert(t('userAppDetail.messages.revoked'))
      navigate('/my-apps')
    } catch (e: any) {
      console.error(e)
      uiAlert(e?.response?.data?.error || t('userAppDetail.errors.revokeFailed'))
      setRevoking(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.DetailPage />
        </div>
      </Layout>
    )
  }

  if (error || !app) {
    return (
      <Layout>
        <div className="space-y-6">
          <Link to="/my-apps" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            {t('userAppDetail.actions.back')}
          </Link>
          <PAlert variant="error" title={t('userAppDetail.errors.title')} message={error || t('userAppDetail.errors.notFound')} actions={[{ label: t('userAppDetail.actions.retry'), onClick: load }]} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/*  */}
        <Link to="/my-apps" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          {t('userAppDetail.actions.backToMyApps')}
        </Link>

        {/*  */}
        <PCard>
          <div className="flex items-start space-x-6">
            {app.app_icon_url ? (
              <img src={app.app_icon_url} alt={app.app_name} className="h-20 w-20 rounded-lg" />
            ) : (
              <div className="h-20 w-20 rounded-lg bg-blue-50 flex items-center justify-center">
                <CubeIcon className="h-10 w-10 text-blue-600" />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{app.app_name}</h1>
              <p className="mt-2 text-gray-600">{app.app_description || t('userAppDetail.noDescription')}</p>
            </div>
          </div>
        </PCard>

        {/*  */}
        <PCard>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('userAppDetail.sections.authorizationInfo')}</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('userAppDetail.fields.firstAuthorizedAt')}</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(app.first_authorized_at).toLocaleString(locale)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('userAppDetail.fields.lastActiveAt')}</span>
              <span className="text-sm font-medium text-gray-900">
                {app.last_active_at ? new Date(app.last_active_at).toLocaleString(locale) : t('userAppDetail.dash')}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('userAppDetail.fields.lastAuthorizedAt')}</span>
              <span className="text-sm font-medium text-gray-900">
                {new Date(app.last_authorized_at).toLocaleString(locale)}
              </span>
            </div>
          </div>
        </PCard>

        {/*  */}
        {app.scopes && (
          <PCard>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-gray-400" />
              {t('userAppDetail.sections.scopes')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {app.scopes.split(/[ ,]+/).filter(Boolean).map((scope) => (
                <span 
                  key={scope} 
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                >
                  {scope}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-gray-500">
              {t('userAppDetail.scopeHint')}
            </p>
          </PCard>
        )}

        {/*  */}
        <div className="flex justify-end">
          <PButton
            onClick={revoke}
            disabled={revoking}
            loading={revoking}
            variant="danger"
            leftIcon={<TrashIcon className="h-4 w-4" />}
          >
            {t('userAppDetail.actions.revoke')}
          </PButton>
        </div>
      </div>
    </Layout>
  )
}
