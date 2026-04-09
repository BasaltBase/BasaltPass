import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { appApi, OAuthClientInfo, CreateOAuthClientRequest, UpdateOAuthClientRequest } from '@api/admin/app'
import { oauthApi, type OAuthScopeMeta } from '@api/oauth/oauth'
import AdminLayout from '@features/admin/components/AdminLayout'
import { ROUTES } from '@constants'
import { OAuthScopePicker } from '@components'
import { PSkeleton, PBadge, PAlert, PButton, PCard, PInput, PPageHeader } from '@ui'
import { useI18n } from '@shared/i18n'

export default function OAuthClientConfig() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [client, setClient] = useState<OAuthClientInfo | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeMetas, setScopeMetas] = useState<OAuthScopeMeta[]>([])
  const [scopeLoading, setScopeLoading] = useState(false)
  
  const [formData, setFormData] = useState<CreateOAuthClientRequest>({
    app_id: appId || '',
    client_type: 'public',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scopes: ['openid', 'profile', 'email'],
    redirect_uris: ['']
  })

  useEffect(() => {
    if (appId) {
      loadOAuthClient()
    }
  }, [appId])

  useEffect(() => {
    let cancelled = false
    const loadScopes = async () => {
      setScopeLoading(true)
      try {
        const resp = await oauthApi.listScopes()
        if (cancelled) return
        setScopeMetas(resp?.data?.data?.scopes || [])
      } catch (e) {
        // keep fallback scopes
      } finally {
        if (cancelled) return
        setScopeLoading(false)
      }
    }

    loadScopes()
    return () => {
      cancelled = true
    }
  }, [])

  const loadOAuthClient = async () => {
    if (!appId) return

    try {
      setLoading(true)
      const response = await appApi.getOAuthClient(appId)
      setClient(response)
      
      if (response) {
        setFormData(prev => ({
          ...prev,
          grant_types: response.grant_types || ['authorization_code', 'refresh_token'],
          response_types: response.response_types || ['code'],
          scopes: response.scopes || ['openid', 'profile', 'email'],
          redirect_uris: response.redirect_uris || ['']
        }))
      }
    } catch (error) {
      console.error('Failed to load OAuth client:', error)
      setError(t('adminOAuthClientConfig.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appId) return

    try {
      setSaving(true)
      
      const cleanedData = {
        ...formData,
        redirect_uris: (formData.redirect_uris || []).filter(uri => uri.trim())
      }

      if (client) {
        const updateData: UpdateOAuthClientRequest = {
          grant_types: cleanedData.grant_types,
          response_types: cleanedData.response_types,
          scopes: cleanedData.scopes,
          redirect_uris: cleanedData.redirect_uris
        }
        await appApi.updateOAuthClient(client.id, updateData)
      } else {
        await appApi.createOAuthClient(cleanedData)
      }
      
      await loadOAuthClient()
      setError(null)
    } catch (error) {
      console.error('Failed to save OAuth client:', error)
      setError(client ? t('adminOAuthClientConfig.errors.updateFailed') : t('adminOAuthClientConfig.errors.createFailed'))
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateSecret = async () => {
    if (!client || !await uiConfirm(t('adminOAuthClientConfig.confirmRegenerateSecret'))) {
      return
    }

    try {
      setSaving(true)
      await appApi.regenerateClientSecret(client.id)
      await loadOAuthClient()
      setError(null)
    } catch (error) {
      console.error('Failed to regenerate secret:', error)
      setError(t('adminOAuthClientConfig.errors.regenerateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      uiAlert(t('adminOAuthClientConfig.messages.copied'))
    }).catch(() => {
      uiAlert(t('adminOAuthClientConfig.messages.copyFailed'))
    })
  }

  const addRedirectUri = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...(prev.redirect_uris || []), '']
    }))
  }

  const removeRedirectUri = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: (prev.redirect_uris || []).filter((_, i) => i !== index)
    }))
  }

  const updateRedirectUri = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: (prev.redirect_uris || []).map((uri, i) => i === index ? value : uri)
    }))
  }

  const toggleScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: (prev.scopes || []).includes(scope)
        ? (prev.scopes || []).filter(s => s !== scope)
        : [...(prev.scopes || []), scope]
    }))
  }

  const pickerMetas = (scopeMetas || [])

  const availableGrantTypes = [
    {
      id: 'authorization_code',
      name: t('adminOAuthClientConfig.grantTypes.authorizationCode.name'),
      description: t('adminOAuthClientConfig.grantTypes.authorizationCode.description')
    },
    {
      id: 'refresh_token',
      name: t('adminOAuthClientConfig.grantTypes.refreshToken.name'),
      description: t('adminOAuthClientConfig.grantTypes.refreshToken.description')
    },
    {
      id: 'client_credentials',
      name: t('adminOAuthClientConfig.grantTypes.clientCredentials.name'),
      description: t('adminOAuthClientConfig.grantTypes.clientCredentials.description')
    }
  ]

  if (loading) {
    return (
      <AdminLayout title={t('adminOAuthClientConfig.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Content cards={3} />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminOAuthClientConfig.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('adminOAuthClientConfig.header.title')}
          description={client ? t('adminOAuthClientConfig.header.descriptionEdit') : t('adminOAuthClientConfig.header.descriptionCreate')}
          icon={<KeyIcon className="h-8 w-8 text-indigo-600" />}
        />

        {error && <PAlert variant="error" message={error} className="mb-6" />}

        <div className="space-y-8">
          {client && (
            <PCard className="rounded-xl p-0 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{t('adminOAuthClientConfig.credentials.title')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('adminOAuthClientConfig.credentials.description')}
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('adminOAuthClientConfig.credentials.clientId')}</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <PInput
                      type="text"
                      value={client.client_id}
                      readOnly
                      className="flex-1"
                    />
                    <button
                      onClick={() => copyToClipboard(client.client_id)}
                      className="inline-flex items-center rounded-lg border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-50"
                      title={t('adminOAuthClientConfig.actions.copy')}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('adminOAuthClientConfig.credentials.clientSecret')}</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <PInput
                      type={showSecret ? "text" : "password"}
                      value={client.client_secret}
                      readOnly
                      className="flex-1"
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="inline-flex items-center rounded-lg border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-50"
                      title={showSecret ? t('adminOAuthClientConfig.actions.hide') : t('adminOAuthClientConfig.actions.show')}
                    >
                      {showSecret ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(client.client_secret)}
                      className="inline-flex items-center rounded-lg border border-gray-300 p-2 text-gray-700 transition-colors hover:bg-gray-50"
                      title={t('adminOAuthClientConfig.actions.copy')}
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRegenerateSecret}
                      disabled={saving}
                      className="inline-flex items-center rounded-lg border border-yellow-300 p-2 text-yellow-700 transition-colors hover:bg-yellow-50 disabled:opacity-50"
                      title={t('adminOAuthClientConfig.actions.regenerate')}
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('adminOAuthClientConfig.credentials.secretHint')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('adminOAuthClientConfig.credentials.clientType')}</label>
                  <div className="mt-1">
                    <PBadge variant={client.client_type === 'public' ? 'info' : 'success'}>
                      {client.client_type === 'public' ? t('adminOAuthClientConfig.clientTypes.public.name') : t('adminOAuthClientConfig.clientTypes.confidential.name')}
                    </PBadge>
                  </div>
                </div>
              </div>
            </PCard>
          )}

          <PCard className="rounded-xl p-0 shadow-sm">
            <form onSubmit={handleCreateOrUpdate}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{t('adminOAuthClientConfig.form.title')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {t('adminOAuthClientConfig.form.description')}
                </p>
              </div>

              <div className="px-6 py-4 space-y-6">
                {!client && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">{t('adminOAuthClientConfig.form.clientType')}</label>
                    <div className="space-y-3">
                      {[
                        { 
                          id: 'public', 
                          name: t('adminOAuthClientConfig.clientTypes.public.name'),
                          description: t('adminOAuthClientConfig.clientTypes.public.description')
                        },
                        { 
                          id: 'confidential', 
                          name: t('adminOAuthClientConfig.clientTypes.confidential.name'),
                          description: t('adminOAuthClientConfig.clientTypes.confidential.description')
                        }
                      ].map((type) => (
                        <div
                          key={type.id}
                          className={`relative rounded-lg border p-4 cursor-pointer focus:outline-none ${
                            formData.client_type === type.id
                              ? 'border-indigo-500 ring-2 ring-indigo-500'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, client_type: type.id as any }))}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="client_type"
                              value={type.id}
                              checked={formData.client_type === type.id}
                              onChange={() => setFormData(prev => ({ ...prev, client_type: type.id as any }))}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <div className="ml-3">
                              <label className="block text-sm font-medium text-gray-900">
                                {type.name}
                              </label>
                              <p className="text-sm text-gray-500">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('adminOAuthClientConfig.form.grantTypes')}</label>
                  <div className="space-y-2">
                    {availableGrantTypes.map((grantType) => (
                      <div key={grantType.id} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={(formData.grant_types || []).includes(grantType.id)}
                            onChange={() => {
                              setFormData(prev => ({
                                ...prev,
                                grant_types: (prev.grant_types || []).includes(grantType.id)
                                  ? (prev.grant_types || []).filter(g => g !== grantType.id)
                                  : [...(prev.grant_types || []), grantType.id]
                              }))
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-900">
                            {grantType.name}
                          </label>
                          <p className="text-sm text-gray-500">{grantType.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">{t('adminOAuthClientConfig.form.scopes')}</label>
                  <OAuthScopePicker
                    metas={pickerMetas}
                    selected={formData.scopes || []}
                    onToggle={toggleScope}
                    loading={scopeLoading}
                    error={''}
                    columnsMd={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('adminOAuthClientConfig.form.redirectUris')}
                  </label>
                  <div className="space-y-2">
                    {(formData.redirect_uris || []).map((uri, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <PInput
                          type="url"
                          value={uri}
                          onChange={(e) => updateRedirectUri(index, e.target.value)}
                          className="flex-1"
                          placeholder="https://example.com/auth/callback"
                        />
                        {(formData.redirect_uris || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRedirectUri(index)}
                            className="inline-flex items-center rounded-lg border border-red-300 p-2 text-red-700 transition-colors hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRedirectUri}
                      className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      {t('adminOAuthClientConfig.actions.addRedirectUri')}
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {t('adminOAuthClientConfig.form.redirectUrisHint')}
                  </p>
                </div>
              </div>

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <PButton type="button" variant="secondary" onClick={() => navigate(ROUTES.admin.apps)}>{t('adminOAuthClientConfig.actions.cancel')}</PButton>
                <PButton type="submit" disabled={saving} loading={saving}>
                  {client ? t('adminOAuthClientConfig.actions.updateConfig') : t('adminOAuthClientConfig.actions.createClient')}
                </PButton>
              </div>
            </form>
          </PCard>
        </div>
      </div>
    </AdminLayout>
  )
}
