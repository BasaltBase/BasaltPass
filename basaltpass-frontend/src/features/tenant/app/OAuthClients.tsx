import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { 
  PlusIcon, 
  EyeIcon, 
  TrashIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantOAuthApi, TenantAppWithClients, TenantOAuthClient } from '@api/tenant/tenantOAuth'
import { PButton, PInput, PSkeleton, PBadge, PPagination, PPageHeader } from '@ui'
import CreateOAuthClientModal from '@features/tenant/app/components/CreateOAuthClientModal'
import OAuthClientDetailModal from '@features/tenant/app/components/OAuthClientDetailModal'
import { useI18n } from '@shared/i18n'


export default function TenantOAuthClients() {
  const { t } = useI18n()
  const [apps, setApps] = useState<TenantAppWithClients[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<TenantOAuthClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const pageSize = 10

  const loadAppsWithClients = async () => {
    try {
      setLoading(true)
      const response = await tenantOAuthApi.listAppsWithClients(page, pageSize, search)
      setApps(response.data.apps || [])
      setTotal(response.data.total || 0)
    } catch (err: any) {
      setError(err.response?.data?.error || t('tenantOAuthClients.errors.loadFailed'))
      setApps([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppsWithClients()
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadAppsWithClients()
  }

  const handleDelete = async (client: TenantOAuthClient) => {
    if (!await uiConfirm(t('tenantOAuthClients.confirmDelete', { id: client.client_id }))) return

    try {
      await tenantOAuthApi.deleteClient(client.client_id)
      loadAppsWithClients()
    } catch (err: any) {
      uiAlert(err.response?.data?.error || t('tenantOAuthClients.errors.deleteFailed'))
    }
  }

  const handleViewDetail = (client: TenantOAuthClient) => {
    setSelectedClient(client)
    setShowDetailModal(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <TenantLayout title={t('tenantOAuthClients.layoutTitle')}>
      <div>
        {/*  */}
        <PPageHeader
          title={t('tenantOAuthClients.title')}
          description={t('tenantOAuthClients.description')}
          icon={<KeyIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton
              onClick={() => setShowCreateModal(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              {t('tenantOAuthClients.actions.createClient')}
            </PButton>
          }
        />

        {/*  */}
        <div className="flex justify-between items-center mb-6">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="min-w-[240px]">
              <PInput
                type="text"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder={t('tenantOAuthClients.searchPlaceholder')}
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                variant="rounded"
                autoComplete="off"
              />
            </div>
            <PButton type="submit" variant="primary">{t('tenantOAuthClients.actions.search')}</PButton>
          </form>
        </div>

        {/*  */}
        <div className="rounded-xl bg-white shadow-sm">
          {loading ? (
            <PSkeleton.List items={3} />
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto" />
              <p className="mt-2 text-red-600">{error}</p>
              <div className="mt-2">
                <PButton onClick={loadAppsWithClients}>{t('tenantOAuthClients.actions.reload')}</PButton>
              </div>
            </div>
          ) : !apps || apps.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">{t('tenantOAuthClients.empty.noApps')}</p>
              <PButton onClick={() => setShowCreateModal(true)} className="mt-2">
                {t('tenantOAuthClients.actions.createFirstClient')}
              </PButton>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(apps || []).map((app) => (
                <div key={app.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{app.name}</h3>
                      <p className="text-sm text-gray-500">{app.description}</p>
                    </div>
                    <PBadge variant={app.status === 'active' ? 'success' : 'error'}>
                      {app.status === 'active' ? t('tenantOAuthClients.status.active') : t('tenantOAuthClients.status.inactive')}
                    </PBadge>
                  </div>

                  {!app.oauth_clients || app.oauth_clients.length === 0 ? (
                    <div className="rounded-xl bg-gray-50 py-8 text-center">
                      <KeyIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-4">{t('tenantOAuthClients.empty.noClientsForApp')}</p>
                      <PButton onClick={() => setShowCreateModal(true)}>
                        {t('tenantOAuthClients.actions.createClient')}
                      </PButton>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('tenantOAuthClients.columns.clientId')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('tenantOAuthClients.columns.status')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('tenantOAuthClients.columns.createdAt')}
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              {t('tenantOAuthClients.columns.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(app.oauth_clients || []).map((client) => (
                            <tr key={client.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  {client.client_id}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <PBadge variant={client.is_active ? 'success' : 'error'}>
                                  {client.is_active ? t('tenantOAuthClients.status.active') : t('tenantOAuthClients.status.inactive')}
                                </PBadge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {client.created_at}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleViewDetail(client)}
                                    className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                                    title={t('tenantOAuthClients.actions.viewDetail')}
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(client)}
                                    className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                                    title={t('tenantOAuthClients.actions.delete')}
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
                  )}
                </div>
              ))}

              {/*  */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
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
            </div>
          )}
        </div>

        {/*  */}
        <CreateOAuthClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAppsWithClients}
          apps={(apps || []).map(app => ({
            id: app.id,
            name: app.name,
            description: app.description
          }))}
        />

        {/*  */}
        <OAuthClientDetailModal
          client={selectedClient}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedClient(null)
          }}
          onUpdate={loadAppsWithClients}
        />
      </div>
    </TenantLayout>
  )
}
