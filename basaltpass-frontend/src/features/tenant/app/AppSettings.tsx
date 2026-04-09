import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import PInput from '@ui/PInput'
import PTextarea from '@ui/PTextarea'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import PBadge from '@ui/PBadge'
import { tenantAppApi, TenantApp, UpdateTenantAppRequest } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'
import { PSkeleton } from '@ui'
import { useI18n } from '@shared/i18n'

export default function AppSettings() {
  const { t, locale } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<TenantApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  // 
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    homepage_url: '',
    privacy_policy_url: '',
    terms_of_service_url: '',
    is_verified: false,
    redirect_uris: [''],
    status: 'active' as 'active' | 'inactive' | 'pending'
  })

  useEffect(() => {
    if (id) {
      fetchAppDetail()
    }
  }, [id])

  const fetchAppDetail = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await tenantAppApi.getTenantApp(id)
      const appData = response.data
      setApp(appData)
      
      // 
      setFormData({
        name: appData.name || '',
        description: appData.description || '',
        logo_url: appData.logo_url || (appData as any).icon_url || '',
        homepage_url: appData.homepage_url || '',
        privacy_policy_url: appData.privacy_policy_url || '',
        terms_of_service_url: appData.terms_of_service_url || '',
        is_verified: appData.is_verified ?? false,
        redirect_uris: appData.oauth_clients?.[0]?.redirect_uris?.length ? appData.oauth_clients[0].redirect_uris : [''],
        status: appData.status || 'active'
      })
    } catch (err: any) {
      console.error(t('tenantAppSettings.logs.fetchDetailFailed'), err)
      setError(err.response?.data?.error || t('tenantAppSettings.errors.fetchDetailFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCallbackUrlChange = (index: number, value: string) => {
    const newCallbackUrls = [...formData.redirect_uris]
    newCallbackUrls[index] = value
    setFormData(prev => ({
      ...prev,
      redirect_uris: newCallbackUrls
    }))
  }

  const addCallbackUrl = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...prev.redirect_uris, '']
    }))
  }

  const removeCallbackUrl = (index: number) => {
    if (formData.redirect_uris.length === 1) return
    const newCallbackUrls = formData.redirect_uris.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      redirect_uris: newCallbackUrls
    }))
  }

  const handleSave = async () => {
    if (!id || !app) return

    try {
      setSaving(true)
      
      // ，URL
      const updateData: UpdateTenantAppRequest = {
        name: formData.name,
        description: formData.description,
        logo_url: formData.logo_url || undefined,
        homepage_url: formData.homepage_url || undefined,
        privacy_policy_url: formData.privacy_policy_url || undefined,
        terms_of_service_url: formData.terms_of_service_url || undefined,
        is_verified: formData.is_verified,
        redirect_uris: formData.redirect_uris.filter(url => url.trim() !== ''),
        status: formData.status
      }

      await tenantAppApi.updateTenantApp(id, updateData)
      
      // 
      await fetchAppDetail()
      
      // 
      uiAlert(t('tenantAppSettings.success.saved'))
    } catch (err: any) {
      console.error(t('tenantAppSettings.logs.saveFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppSettings.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !app) return
    if (deleteConfirmText !== app.name) {
      uiAlert(t('tenantAppSettings.errors.confirmNameMismatch'))
      return
    }

    try {
      await tenantAppApi.deleteTenantApp(id)
      navigate(ROUTES.tenant.apps)
    } catch (err: any) {
      console.error(t('tenantAppSettings.logs.deleteFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppSettings.errors.deleteFailed'))
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
        return t('tenantAppSettings.status.active')
      case 'inactive':
        return t('tenantAppSettings.status.inactive')
      case 'pending':
        return t('tenantAppSettings.status.pending')
      default:
        return t('tenantAppSettings.status.unknown')
    }
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantAppSettings.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Content cards={3} />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantAppSettings.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={fetchAppDetail}>{t('tenantAppSettings.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (!app) {
    return (
      <TenantLayout title={t('tenantAppSettings.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantAppSettings.empty.notFound')}</h3>
            <div className="mt-6">
              <Link to={ROUTES.tenant.apps}>
                <PButton>{t('tenantAppSettings.actions.backToList')}</PButton>
              </Link>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantAppSettings.layoutWithApp', { name: app.name })}>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/*  */}
        <div className="mb-6">
          <nav className="flex items-center space-x-4">
            <Link
              to={ROUTES.tenant.apps}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              {t('tenantAppSettings.breadcrumb.apps')}
            </Link>
            <span className="text-gray-300">/</span>
            <Link
              to={`/tenant/apps/${app.id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {app.name}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">{t('tenantAppSettings.breadcrumb.settings')}</span>
          </nav>
        </div>

        {/*  */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t('tenantAppSettings.title')}</h1>
              <p className="mt-2 text-gray-600">{t('tenantAppSettings.description')}</p>
            </div>
            <div className="flex items-center space-x-3">
              <PBadge variant={getStatusVariant(app.status) as any}>
                {getStatusText(app.status)}
              </PBadge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/*  */}
          <div className="lg:col-span-2 space-y-6">
            {/*  */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{t('tenantAppSettings.sections.basicInfo')}</h2>
              
              <div className="space-y-4">
                <PInput
                  label={t('tenantAppSettings.fields.appName')}
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
                  placeholder={t('tenantAppSettings.placeholders.appName')}
                />

                <PTextarea
                  label={t('tenantAppSettings.fields.appDescription')}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', (e.target as HTMLTextAreaElement).value)}
                  rows={3}
                  placeholder={t('tenantAppSettings.placeholders.appDescription')}
                />

                <PSelect
                  label={t('tenantAppSettings.fields.status')}
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', (e.target as HTMLSelectElement).value)}
                >
                  <option value="active">{t('tenantAppSettings.status.active')}</option>
                  <option value="inactive">{t('tenantAppSettings.status.inactive')}</option>
                  <option value="pending">{t('tenantAppSettings.status.pending')}</option>
                </PSelect>
              </div>
            </div>

            {/* URL */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{t('tenantAppSettings.sections.urlConfig')}</h2>
              
              <div className="space-y-4">
                <PInput
                  label="Logo URL"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => handleInputChange('logo_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/logo.png"
                />

                <PInput
                  label={t('tenantAppSettings.fields.homepageUrl')}
                  type="url"
                  value={formData.homepage_url}
                  onChange={(e) => handleInputChange('homepage_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com"
                />

                <PInput
                  label={t('tenantAppSettings.fields.privacyPolicyUrl')}
                  type="url"
                  value={formData.privacy_policy_url}
                  onChange={(e) => handleInputChange('privacy_policy_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/privacy"
                />

                <PInput
                  label={t('tenantAppSettings.fields.termsUrl')}
                  type="url"
                  value={formData.terms_of_service_url}
                  onChange={(e) => handleInputChange('terms_of_service_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/terms"
                />

                {/*  */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600">
                      <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t('tenantAppSettings.fields.markVerified')}</p>
                      <p className="text-xs text-gray-500">
                        {t('tenantAppSettings.hints.verifiedApp')}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_verified}
                    onClick={() => setFormData(prev => ({ ...prev, is_verified: !prev.is_verified }))}
                    className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.is_verified ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.is_verified ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* OAuth */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">{t('tenantAppSettings.sections.oauthRedirectUris')}</h2>
                <PButton variant="secondary" size="sm" onClick={addCallbackUrl} leftIcon={<PlusIcon className="w-4 h-4" />}>{t('tenantAppSettings.actions.add')}</PButton>
              </div>
              
              <div className="space-y-3">
                {formData.redirect_uris.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <PInput
                        type="url"
                        value={url}
                        onChange={(e) => handleCallbackUrlChange(index, (e.target as HTMLInputElement).value)}
                        placeholder="https://example.com/callback"
                        autoComplete="off"
                      />
                    </div>
                    {formData.redirect_uris.length > 1 && (
                      <PButton 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => removeCallbackUrl(index)}
                        aria-label={t('tenantAppSettings.actions.remove')}
                        leftIcon={<XMarkIcon className="w-4 h-4" />}
                      >{t('tenantAppSettings.actions.remove')}</PButton>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/*  */}
          <div className="space-y-6">
            {/*  */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tenantAppSettings.sections.actions')}</h3>
              <div className="space-y-3">
                <PButton
                  onClick={handleSave}
                  loading={saving}
                  fullWidth
                  leftIcon={!saving ? <CheckIcon className="w-4 h-4" /> : undefined}
                >
                  {saving ? t('tenantAppSettings.actions.saving') : t('tenantAppSettings.actions.saveSettings')}
                </PButton>
                
                <Link to={`/tenant/apps/${app.id}`}>
                  <PButton variant="secondary" fullWidth>
                    {t('tenantAppSettings.actions.cancel')}
                  </PButton>
                </Link>
              </div>
            </div>

            {/* OAuth */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-medium text-gray-900">{t('tenantAppSettings.sections.oauthClients')}</h3>
                <Link to={ROUTES.tenant.oauthClients} className="shrink-0">
                  <PButton variant="secondary" size="sm">{t('tenantAppSettings.actions.manage')}</PButton>
                </Link>
              </div>

              {!app.oauth_clients || app.oauth_clients.length === 0 ? (
                <div className="text-sm text-gray-500">
                  {t('tenantAppSettings.empty.noOAuthClients')}
                </div>
              ) : (
                <div className="space-y-4">
                  {app.oauth_clients.map((client) => (
                    <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 break-all">
                            {client.client_id}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {t('tenantAppSettings.fields.createdAtPrefix')} {new Date(client.created_at).toLocaleString(locale)}
                          </div>
                        </div>
                        <PBadge variant={client.is_active ? 'success' : 'default'}>
                          {client.is_active ? t('tenantAppSettings.status.enabled') : t('tenantAppSettings.status.disabled')}
                        </PBadge>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium text-gray-500">Redirect URIs</div>
                        {client.redirect_uris && client.redirect_uris.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {client.redirect_uris.map((uri) => (
                              <div key={uri} className="text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded px-2 py-1 break-all">
                                {uri}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 text-sm text-gray-500">{t('tenantAppSettings.empty.notConfigured')}</div>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium text-gray-500 mb-2">Scopes</div>
                        <div className="flex flex-wrap gap-2">
                          {(client.scopes || []).map((scope) => (
                            <span key={scope} className="inline-flex px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded">
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/*  */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('tenantAppSettings.sections.appInfo')}</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('tenantAppSettings.fields.appId')}</dt>
                  <dd className="text-sm text-gray-900 font-mono">{app.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('tenantAppSettings.fields.createdAt')}</dt>
                  <dd className="text-sm text-gray-900">{new Date(app.created_at).toLocaleString(locale)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">{t('tenantAppSettings.fields.updatedAt')}</dt>
                  <dd className="text-sm text-gray-900">{new Date(app.updated_at).toLocaleString(locale)}</dd>
                </div>
              </dl>
            </div>

            {/*  */}
            <div className="bg-white shadow-sm border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-900 mb-4">{t('tenantAppSettings.sections.dangerZone')}</h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('tenantAppSettings.hints.deleteWarning')}
              </p>
              <PButton
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                fullWidth
                leftIcon={<TrashIcon className="w-4 h-4" />}
              >
                {t('tenantAppSettings.actions.deleteApp')}
              </PButton>
            </div>
          </div>
        </div>

        {/*  */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 !m-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">{t('tenantAppSettings.deleteModal.title')}</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('tenantAppSettings.deleteModal.description', { name: app.name })}
              </p>
              
              <p className="text-sm text-gray-600 mb-4">
                {t('tenantAppSettings.deleteModal.confirmInputLabel', { name: app.name })}
              </p>
              
              <div className="mb-4">
                <PInput
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText((e.target as HTMLInputElement).value)}
                  placeholder={t('tenantAppSettings.deleteModal.confirmInputPlaceholder')}
                />
              </div>
              
              <div className="flex space-x-3">
                <PButton
                  variant="danger"
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== app.name}
                  className="flex-1"
                >
                  {t('tenantAppSettings.actions.confirmDelete')}
                </PButton>
                <PButton
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  className="flex-1"
                >
                  {t('tenantAppSettings.actions.cancel')}
                </PButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
