import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { ExclamationTriangleIcon, KeyIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { tenantOAuthApi, CreateTenantOAuthClientRequest, type OAuthScopeMeta } from '@api/tenant/tenantOAuth'
import { PButton, PInput, PSelect, PTextarea } from '@ui'
import { OAuthScopePicker } from '@components'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export interface CreateOAuthClientModalApp {
  id: number
  name: string
  description?: string
}

interface CreateOAuthClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apps: CreateOAuthClientModalApp[]
  /** Preselect an app id when opening */
  defaultAppId?: number
  /** Lock the app selector when used from an app detail page */
  lockAppSelect?: boolean
}

export default function CreateOAuthClientModal({
  isOpen,
  onClose,
  onSuccess,
  apps,
  defaultAppId,
  lockAppSelect = false
}: CreateOAuthClientModalProps) {
  const initialAppId = defaultAppId ?? (apps?.[0]?.id ?? 0)

  const [formData, setFormData] = useState<CreateTenantOAuthClientRequest>({
    app_id: initialAppId,
    name: '',
    description: '',
    redirect_uris: [''],
    scopes: ['openid', 'profile', 'email'],
    allowed_origins: ['']
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdCredentials, setCreatedCredentials] = useState<{ clientId: string; clientSecret: string } | null>(null)

  const [scopeMetas, setScopeMetas] = useState<OAuthScopeMeta[]>([])
  const [scopeDefaults, setScopeDefaults] = useState<string[]>(['openid', 'profile', 'email'])
  const [scopeLoading, setScopeLoading] = useState(false)
  const [scopeError, setScopeError] = useState('')

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    const loadScopes = async () => {
      setScopeLoading(true)
      setScopeError('')
      try {
        const resp = await tenantOAuthApi.listScopes()
        if (cancelled) return
        setScopeMetas(resp?.data?.scopes || [])
        setScopeDefaults(resp?.data?.defaults || ['openid', 'profile', 'email'])
      } catch (e: any) {
        if (cancelled) return
        setScopeError(e?.response?.data?.error || 'Failed to load scopes')
      } finally {
        if (cancelled) return
        setScopeLoading(false)
      }
    }

    loadScopes()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setFormData(prev => {
      const current = prev.scopes || []
      if (current.length === 0) {
        return { ...prev, scopes: scopeDefaults }
      }
      return prev
    })
  }, [isOpen, scopeDefaults])

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    uiAlert('Copied to clipboard')
  }

  const resetForm = () => {
    setCreatedCredentials(null)
    setError('')
    setFormData({
      app_id: initialAppId,
      name: '',
      description: '',
      redirect_uris: [''],
      scopes: scopeDefaults,
      allowed_origins: ['']
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const cleanedData = {
        ...formData,
        redirect_uris: (formData.redirect_uris || []).filter(uri => uri.trim() !== ''),
        allowed_origins: (formData.allowed_origins || []).filter(origin => origin.trim() !== '')
      }

      const response = await tenantOAuthApi.createClient(cleanedData)
      const clientId = response?.data?.client?.client_id
      const clientSecret = response?.data?.client?.client_secret

      if (!clientId || !clientSecret) {
        onSuccess()
        onClose()
        setError('Client created, but no secret was returned; open details and click "Regenerate" to get a new secret')
        return
      }

      setCreatedCredentials({ clientId, clientSecret })
    } catch (err: any) {
      setError(err.response?.data?.error || 'Creation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDone = () => {
    onSuccess()
    onClose()
    resetForm()
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
      redirect_uris: (prev.redirect_uris || []).map((uri, i) => (i === index ? value : uri))
    }))
  }

  const addAllowedOrigin = () => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: [...(prev.allowed_origins || []), '']
    }))
  }

  const removeAllowedOrigin = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: (prev.allowed_origins || []).filter((_, i) => i !== index)
    }))
  }

  const updateAllowedOrigin = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: (prev.allowed_origins || []).map((origin, i) => (i === index ? value : origin))
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


  if (!isOpen) return null

  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-8">
      <div className="relative w-full max-w-6xl mx-2 bg-white shadow-xl rounded-xl border border-gray-100">
        <div className="bg-white px-6 py-5 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-indigo-600 p-3">
                  <KeyIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900">Create OAuth Client</h3>
                <p className="mt-1 text-sm text-gray-500">Configure an OAuth 2.0 client for your app</p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose()
                resetForm()
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="sr-only">Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {createdCredentials ? (
          <div className="px-6 py-6 space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">Client created successfully. The secret is shown only once; please save it now.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client ID</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded border border-gray-200 break-all">{createdCredentials.clientId}</code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdCredentials.clientId)}
                    className="text-gray-600 hover:text-gray-800"
                    title="Copy"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Secret</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-xs text-yellow-800 mb-2">Copy and save it now; it will not be shown again after closing.</p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-sm bg-white p-2 rounded border border-yellow-200 break-all">{createdCredentials.clientSecret}</code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdCredentials.clientSecret)}
                      className="text-yellow-700 hover:text-yellow-900"
                      title="Copy"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <form id="oauth-client-form" onSubmit={handleSubmit} className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left column: name/callback/cors */}
              <div className="space-y-6">
                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center mb-4">
                    <div className="h-2 w-2 bg-indigo-600 rounded-full mr-3"></div>
                    <h4 className="text-lg font-medium text-gray-900">Basic Information</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="sm:col-span-2">
                      <PSelect
                        required
                        value={formData.app_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, app_id: parseInt((e.target as HTMLSelectElement).value) }))}
                        disabled={lockAppSelect}
                        label={
                          <span>
                            Linked App <span className="text-red-500">*</span>
                          </span>
                        }
                        variant="rounded"
                        size="lg"
                      >
                        <option value={0}>Please select an app to configure</option>
                        {(apps || []).map(app => (
                          <option key={app.id} value={app.id}>{app.name}</option>
                        ))}
                      </PSelect>
                    </div>

                    <div>
                      <PInput
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: (e.target as HTMLInputElement).value }))}
                        label={
                          <span>
                            Client Name <span className="text-red-500">*</span>
                          </span>
                        }
                        placeholder="e.g. Web Client"
                        variant="rounded"
                        size="lg"
                        autoComplete="off"
                      />
                    </div>

                    <div>
                      <PTextarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: (e.target as HTMLTextAreaElement).value }))}
                        label="Client Description"
                        rows={3}
                        placeholder="Briefly describe this client..."
                        variant="rounded"
                        size="lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-200 pb-6">
                  <div className="flex items-center mb-4">
                    <div className="h-2 w-2 bg-emerald-600 rounded-full mr-3"></div>
                    <h4 className="text-lg font-medium text-gray-900">Callback URLs</h4>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Redirect URI <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      {(formData.redirect_uris || []).map((uri, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-1">
                            <PInput
                              type="url"
                              value={uri}
                              onChange={(e) => updateRedirectUri(index, (e.target as HTMLInputElement).value)}
                              placeholder="https://example.com/auth/callback"
                              variant="rounded"
                              size="lg"
                              aria-label={`Redirect URI ${index + 1}`}
                              autoComplete="off"
                            />
                          </div>
                          {(formData.redirect_uris || []).length > 1 && (
                            <PButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => removeRedirectUri(index)}
                              className="px-3"
                              title="Delete URI"
                              aria-label="Delete URI"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </PButton>
                          )}
                        </div>
                      ))}
                      <PButton
                        type="button"
                        onClick={addRedirectUri}
                        variant="secondary"
                        size="sm"
                        leftIcon={<PlusIcon className="h-4 w-4" />}
                      >
                        Add Redirect URI
                      </PButton>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> Users will be redirected to these addresses after authorization. Ensure each URL is valid and uses HTTPS.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pb-6">
                  <div className="flex items-center mb-4">
                    <div className="h-2 w-2 bg-purple-600 rounded-full mr-3"></div>
                    <h4 className="text-lg font-medium text-gray-900">CORS Configuration</h4>
                    <span className="ml-2 text-sm text-gray-500">(Optional)</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Allowed Origins</label>
                    <div className="space-y-3">
                      {(formData.allowed_origins || []).map((origin, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className="flex-1">
                            <PInput
                              type="url"
                              value={origin}
                              onChange={(e) => updateAllowedOrigin(index, (e.target as HTMLInputElement).value)}
                              placeholder="https://example.com"
                              variant="rounded"
                              size="lg"
                              aria-label={`Allowed origin ${index + 1}`}
                              autoComplete="off"
                            />
                          </div>
                          <PButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => removeAllowedOrigin(index)}
                            className="px-3"
                            title="Delete origin"
                            aria-label="Delete origin"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </PButton>
                        </div>
                      ))}
                      <PButton
                        type="button"
                        onClick={addAllowedOrigin}
                        variant="secondary"
                        size="sm"
                        leftIcon={<PlusIcon className="h-4 w-4" />}
                      >
                        Add Allowed Origin
                      </PButton>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Configure origins allowed for cross-origin requests</p>
                  </div>
                </div>
              </div>

              {/* Right column: scopes */}
              <div className="lg:pt-1">
                <div className="border border-gray-200 rounded-xl p-5 bg-gray-50">
                  <div className="flex items-center mb-4">
                    <div className="h-2 w-2 bg-amber-600 rounded-full mr-3"></div>
                    <h4 className="text-lg font-medium text-gray-900">Scopes</h4>
                  </div>
                  <OAuthScopePicker
                    metas={scopeMetas}
                    selected={formData.scopes || []}
                    onToggle={toggleScope}
                    loading={scopeLoading}
                    error={scopeError}
                    columnsMd={2}
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex flex-col sm:flex-row sm:justify-end gap-3">
          <PButton
            type="button"
            variant="secondary"
            onClick={createdCredentials ? handleDone : () => {
              onClose()
              resetForm()
            }}
            className="w-full sm:w-auto"
          >
            {createdCredentials ? 'Done' : 'Cancel'}
          </PButton>
          {!createdCredentials && (
            <PButton
              type="submit"
              form="oauth-client-form"
              loading={isLoading}
              className="w-full sm:w-auto"
              leftIcon={<KeyIcon className="h-4 w-4" />}
            >
              Create Client
            </PButton>
          )}
        </div>
      </div>
    </div>
  )
}
