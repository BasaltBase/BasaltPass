import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { oauthApi, type OAuthClient, type CreateClientRequest, type OAuthScopeMeta } from '@api/oauth/oauth'
import { Link } from 'react-router-dom'
import AdminLayout from '@features/admin/components/AdminLayout'
import { ROUTES } from '@constants'
import { OAuthScopePicker } from '@components'
import { PSkeleton, PBadge, PAlert, PPageHeader, PPagination, PButton, PInput, PTextarea, Modal } from '@ui'
import { useI18n } from '@shared/i18n'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateClientModal({ isOpen, onClose, onSuccess }: CreateClientModalProps) {
  const { t, locale } = useI18n()
  const [formData, setFormData] = useState<CreateClientRequest>({
    name: '',
    description: '',
    redirect_uris: [''],
    scopes: ['openid', 'profile', 'email'],
    allowed_origins: ['']
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
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
        const resp = await oauthApi.listScopes()
        if (cancelled) return
        const data = resp?.data?.data
        setScopeMetas(data?.scopes || [])
        setScopeDefaults(data?.defaults || ['openid', 'profile', 'email'])
      } catch (e: any) {
        if (cancelled) return
        setScopeError(e?.response?.data?.error || t('adminOAuthClients.errors.loadScopesFailed'))
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
      if (current.length === 0) return { ...prev, scopes: scopeDefaults }
      return prev
    })
  }, [isOpen, scopeDefaults])

  // scope rendering handled by shared OAuthScopePicker

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const cleanedData = {
        ...formData,
        redirect_uris: formData.redirect_uris.filter(uri => uri.trim() !== ''),
        allowed_origins: formData.allowed_origins?.filter(origin => origin.trim() !== '') || []
      }

      await oauthApi.createClient(cleanedData)
      onSuccess()
      onClose()
      setFormData({
        name: '',
        description: '',
        redirect_uris: [''],
        scopes: scopeDefaults,
        allowed_origins: ['']
      })
    } catch (err: any) {
      setError(err.response?.data?.error || t('adminOAuthClients.errors.createFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const addRedirectURI = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...prev.redirect_uris, '']
    }))
  }

  const removeRedirectURI = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.filter((_, i) => i !== index)
    }))
  }

  const updateRedirectURI = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.map((uri, i) => i === index ? value : uri)
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
      allowed_origins: prev.allowed_origins?.filter((_, i) => i !== index) || []
    }))
  }

  const updateAllowedOrigin = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: prev.allowed_origins?.map((origin, i) => i === index ? value : origin) || []
    }))
  }

  if (!isOpen) return null

  return (
    <Modal open={isOpen} onClose={onClose} title={t('adminOAuthClients.createModal.title')} widthClass="max-w-6xl">
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column: name/callback/cors */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PInput
                  label={t('adminOAuthClients.createModal.appNameLabel')}
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('adminOAuthClients.createModal.appNamePlaceholder')}
                />
                <PTextarea
                  label={t('adminOAuthClients.createModal.appDescriptionLabel')}
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('adminOAuthClients.createModal.appDescriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.createModal.redirectUriLabel')}</label>
                {formData.redirect_uris.map((uri, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <PInput
                      type="url"
                      required
                      value={uri}
                      onChange={(e) => updateRedirectURI(index, e.target.value)}
                      className="flex-1"
                      placeholder="https://yourapp.com/callback"
                    />
                    {formData.redirect_uris.length > 1 && (
                      <PButton
                        type="button"
                        variant="ghost"
                        onClick={() => removeRedirectURI(index)}
                      >
                        {t('adminOAuthClients.actions.delete')}
                      </PButton>
                    )}
                  </div>
                ))}
                <PButton type="button" variant="ghost" size="sm" onClick={addRedirectURI}>
                  {t('adminOAuthClients.createModal.addRedirectUri')}
                </PButton>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.createModal.allowedCorsOriginsLabel')}</label>
                {formData.allowed_origins?.map((origin, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <PInput
                      type="url"
                      value={origin}
                      onChange={(e) => updateAllowedOrigin(index, e.target.value)}
                      className="flex-1"
                      placeholder="https://yourapp.com"
                    />
                    <PButton
                      type="button"
                      variant="ghost"
                      onClick={() => removeAllowedOrigin(index)}
                    >
                      {t('adminOAuthClients.actions.delete')}
                    </PButton>
                  </div>
                ))}
                <PButton type="button" variant="ghost" size="sm" onClick={addAllowedOrigin}>
                  {t('adminOAuthClients.createModal.addCorsOrigin')}
                </PButton>
              </div>
            </div>

            {/* Right column: scopes */}
            <div className="lg:pt-1">
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.createModal.scopesLabel')}</label>
                <OAuthScopePicker
                  metas={scopeMetas}
                  selected={formData.scopes || []}
                  onToggle={(scope) => {
                    setFormData(prev => ({
                      ...prev,
                      scopes: (prev.scopes || []).includes(scope)
                        ? (prev.scopes || []).filter(s => s !== scope)
                        : [...(prev.scopes || []), scope]
                    }))
                  }}
                  loading={scopeLoading}
                  error={scopeError}
                  columnsMd={2}
                />
              </div>
            </div>
          </div>

          {error && <PAlert variant="error" message={error} />}
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
            <PButton type="button" variant="secondary" onClick={onClose}>{t('adminOAuthClients.actions.cancel')}</PButton>
            <PButton type="submit" disabled={isLoading} loading={isLoading}>{t('adminOAuthClients.actions.createClient')}</PButton>
          </div>
        </form>
      </div>
    </Modal>
  )
}

interface ClientDetailModalProps {
  client: OAuthClient | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

function ClientDetailModal({ client, isOpen, onClose, onUpdate }: ClientDetailModalProps) {
  const { t, locale } = useI18n()
  const [showSecret, setShowSecret] = useState(false)
  const [newSecret, setNewSecret] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerateSecret = async () => {
    if (!client || !await uiConfirm(t('adminOAuthClients.confirmRegenerateSecret'))) return

    setIsRegenerating(true)
    try {
      const response = await oauthApi.regenerateSecret(client.client_id)
      setNewSecret(response.data.data.client_secret)
      setShowSecret(true)
      onUpdate()
    } catch (err) {
      console.error(t('adminOAuthClients.logs.regenerateSecretFailed'), err)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!isOpen || !client) return null

  return (
    <Modal open={isOpen} onClose={onClose} title={t('adminOAuthClients.detailModal.title')} widthClass="max-w-4xl">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.appName')}</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{client.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.appDescription')}</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{client.description || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.clientId')}</label>
              <p className="text-sm text-gray-900 font-mono bg-gray-100 p-3 rounded-md">
                {client.client_id}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.columns.status')}</label>
              <PBadge variant={client.is_active ? 'success' : 'error'}>
                {client.is_active ? t('adminOAuthClients.status.active') : t('adminOAuthClients.status.inactive')}
              </PBadge>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.clientSecret')}</label>
              <div className="flex items-center gap-2">
                {newSecret ? (
                  <p className="text-sm text-gray-900 font-mono bg-yellow-100 p-3 rounded-md flex-1">
                    {newSecret}
                  </p>
                ) : (
                  <p className="text-sm text-gray-900 font-mono bg-gray-100 p-3 rounded-md flex-1">
                    ••••••••••••••••
                  </p>
                )}
                <PButton
                  onClick={handleRegenerateSecret}
                  disabled={isRegenerating}
                  variant="secondary"
                >
                  {isRegenerating ? t('adminOAuthClients.actions.generating') : t('adminOAuthClients.actions.regenerate')}
                </PButton>
              </div>
              {newSecret && (
                <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded-md">
                  {t('adminOAuthClients.detailModal.newSecretWarning')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.columns.createdAt')}</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{new Date(client.created_at).toLocaleString(locale)}</p>
            </div>

            {client.last_used_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.lastUsedAt')}</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{new Date(client.last_used_at).toLocaleString(locale)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.redirectUris')}</label>
            <div className="space-y-2">
              {client.redirect_uris.map((uri, index) => (
                <p key={index} className="text-sm text-gray-900 font-mono bg-gray-100 p-3 rounded-md">
                  {uri}
                </p>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminOAuthClients.detailModal.scopes')}</label>
            <div className="flex flex-wrap gap-2">
              {client.scopes.map((scope) => (
                <span key={scope} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-gray-200 pt-6">
          <PButton variant="secondary" onClick={onClose}>{t('adminOAuthClients.actions.close')}</PButton>
        </div>
      </div>
    </Modal>
  )
}

export default function OAuthClients() {
  const { t } = useI18n()
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<OAuthClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const pageSize = 10

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await oauthApi.listClients(page, pageSize, search)
      setClients(response.data.data.clients)
      setTotal(response.data.data.total)
    } catch (err: any) {
      setError(err.response?.data?.error || t('adminOAuthClients.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadClients()
  }

  const handleDelete = async (client: OAuthClient) => {
    if (!await uiConfirm(t('adminOAuthClients.confirmDelete', { name: client.name }))) return

    try {
      await oauthApi.deleteClient(client.client_id)
      loadClients()
    } catch (err: any) {
      uiAlert(err.response?.data?.error || t('adminOAuthClients.errors.deleteFailed'))
    }
  }

  const handleViewDetail = (client: OAuthClient) => {
    setSelectedClient(client)
    setShowDetailModal(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminLayout title={t('adminOAuthClients.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('adminOAuthClients.title')}
          description={t('adminOAuthClients.description')}
          icon={<KeyIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={() => setShowCreateModal(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
              {t('adminOAuthClients.actions.createClient')}
            </PButton>
          }
        />

        <div className="bg-white p-4 rounded-lg shadow">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('adminOAuthClients.searchPlaceholder')}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <PButton type="submit">{t('adminOAuthClients.actions.search')}</PButton>
          </form>
        </div>

        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <PSkeleton.List items={4} />
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto" />
              <p className="mt-2 text-red-600">{error}</p>
              <PButton onClick={loadClients} className="mt-4">{t('adminOAuthClients.actions.reload')}</PButton>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">{t('adminOAuthClients.emptyTitle')}</p>
              <PButton onClick={() => setShowCreateModal(true)} className="mt-4">{t('adminOAuthClients.emptyAction')}</PButton>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('adminOAuthClients.columns.appInfo')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('adminOAuthClients.columns.clientId')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('adminOAuthClients.columns.status')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('adminOAuthClients.columns.createdAt')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('adminOAuthClients.columns.actions')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {client.description || '-'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                            {client.client_id}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PBadge variant={client.is_active ? 'success' : 'error'}>
                            {client.is_active ? t('adminOAuthClients.status.active') : t('adminOAuthClients.status.inactive')}
                          </PBadge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {client.created_at}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetail(client)}
                              className="text-blue-600 hover:text-blue-900"
                              title={t('adminOAuthClients.actions.viewDetail')}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(client)}
                              className="text-red-600 hover:text-red-900"
                              title={t('adminOAuthClients.actions.delete')}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200">
                  <PPagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    total={total}
                    pageSize={pageSize}
                    showInfo
                  />
                </div>
              )}
            </>
          )}
        </div>

      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadClients}
      />

      <ClientDetailModal
        client={selectedClient}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedClient(null)
        }}
        onUpdate={loadClients}
      />
      </div>
    </AdminLayout>
  )
} 
