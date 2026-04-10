import { useEffect, useState } from 'react'
import {
  ArrowsRightLeftIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  DocumentTextIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { crossAppTrustApi, CrossAppTrust, TokenExchangeLogEntry } from '@api/tenant/crossAppTrust'
import { tenantAppApi, TenantApp } from '@api/tenant/tenantApp'
import { Modal, PAlert, PBadge, PButton, PInput, PPageHeader, PSkeleton } from '@ui'
import { uiConfirm } from '@contexts/DialogContext'
import { useI18n } from '@shared/i18n'

const formatDateTime = (value: string | undefined, locale: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale)
}

type TabKey = 'trusts' | 'logs'

export default function CrossAppTrustManagement() {
  const { t, locale } = useI18n()

  // ── Tab ──
  const [activeTab, setActiveTab] = useState<TabKey>('trusts')

  // ── Trust list ──
  const [trusts, setTrusts] = useState<CrossAppTrust[]>([])
  const [trustsTotal, setTrustsTotal] = useState(0)
  const [trustsPage, setTrustsPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Apps (for dropdowns) ──
  const [apps, setApps] = useState<TenantApp[]>([])

  // ── Create/Edit modal ──
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTrust, setEditingTrust] = useState<CrossAppTrust | null>(null)
  const [formSourceAppId, setFormSourceAppId] = useState<number>(0)
  const [formTargetAppId, setFormTargetAppId] = useState<number>(0)
  const [formAllowedScopes, setFormAllowedScopes] = useState('')
  const [formMaxTokenTTL, setFormMaxTokenTTL] = useState(300)
  const [formDescription, setFormDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // ── Logs ──
  const [logs, setLogs] = useState<TokenExchangeLogEntry[]>([])
  const [logsTotal, setLogsTotal] = useState(0)
  const [logsPage, setLogsPage] = useState(1)
  const [logsLoading, setLogsLoading] = useState(false)

  // ── Load data ──
  const loadTrusts = async (page = 1) => {
    try {
      setLoading(true)
      setError('')
      const result = await crossAppTrustApi.list(page, 20)
      setTrusts(result.trusts || [])
      setTrustsTotal(result.total)
      setTrustsPage(page)
    } catch (err: any) {
      setError(err.response?.data?.error || t('crossAppTrust.errors.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const loadApps = async () => {
    try {
      const result = await tenantAppApi.listTenantApps(1, 100)
      setApps(result.data?.apps || result.apps || [])
    } catch {
      // silently ignore
    }
  }

  const loadLogs = async (page = 1) => {
    try {
      setLogsLoading(true)
      const result = await crossAppTrustApi.listLogs({ page, page_size: 20 })
      setLogs(result.logs || [])
      setLogsTotal(result.total)
      setLogsPage(page)
    } catch (err: any) {
      setError(err.response?.data?.error || t('crossAppTrust.errors.loadLogsFailed'))
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    loadTrusts()
    loadApps()
  }, [])

  useEffect(() => {
    if (activeTab === 'logs') loadLogs()
  }, [activeTab])

  // ── Handlers ──
  const openCreateModal = () => {
    setEditingTrust(null)
    setFormSourceAppId(0)
    setFormTargetAppId(0)
    setFormAllowedScopes('')
    setFormMaxTokenTTL(300)
    setFormDescription('')
    setModalOpen(true)
  }

  const openEditModal = (trust: CrossAppTrust) => {
    setEditingTrust(trust)
    setFormSourceAppId(trust.source_app_id)
    setFormTargetAppId(trust.target_app_id)
    setFormAllowedScopes(trust.allowed_scopes)
    setFormMaxTokenTTL(trust.max_token_ttl)
    setFormDescription(trust.description)
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingTrust) {
        await crossAppTrustApi.update(editingTrust.id, {
          allowed_scopes: formAllowedScopes,
          max_token_ttl: formMaxTokenTTL,
          description: formDescription,
        })
      } else {
        await crossAppTrustApi.create({
          source_app_id: formSourceAppId,
          target_app_id: formTargetAppId,
          allowed_scopes: formAllowedScopes,
          max_token_ttl: formMaxTokenTTL,
          description: formDescription,
        })
      }
      setModalOpen(false)
      await loadTrusts(trustsPage)
    } catch (err: any) {
      setError(err.response?.data?.error || t('crossAppTrust.errors.saveFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (trust: CrossAppTrust) => {
    const sourceName = trust.source_app?.name || `App #${trust.source_app_id}`
    const targetName = trust.target_app?.name || `App #${trust.target_app_id}`
    const confirmed = await uiConfirm(t('crossAppTrust.confirmDelete', { source: sourceName, target: targetName }))
    if (!confirmed) return
    try {
      await crossAppTrustApi.delete(trust.id)
      await loadTrusts(trustsPage)
    } catch (err: any) {
      setError(err.response?.data?.error || t('crossAppTrust.errors.deleteFailed'))
    }
  }

  const handleToggleActive = async (trust: CrossAppTrust) => {
    try {
      await crossAppTrustApi.update(trust.id, { is_active: !trust.is_active })
      await loadTrusts(trustsPage)
    } catch (err: any) {
      setError(err.response?.data?.error || t('crossAppTrust.errors.toggleFailed'))
    }
  }

  const getAppName = (appId: number): string => {
    const app = apps.find(a => Number(a.id) === appId)
    return app?.name || `App #${appId}`
  }

  const totalTrustPages = Math.ceil(trustsTotal / 20) || 1
  const totalLogPages = Math.ceil(logsTotal / 20) || 1

  return (
    <TenantLayout title={t('crossAppTrust.layoutTitle')}>
      <div className="space-y-6 p-6">
        <PPageHeader
          title={t('crossAppTrust.title')}
          description={t('crossAppTrust.description')}
          icon={<ArrowsRightLeftIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={openCreateModal} leftIcon={<PlusIcon className="h-4 w-4" />}>
              {t('crossAppTrust.actions.createTrust')}
            </PButton>
          }
        />

        <PAlert variant="info" title={t('crossAppTrust.alerts.infoTitle')}>
          {t('crossAppTrust.alerts.infoDescription')}
        </PAlert>

        {error && (
          <PAlert variant="error" title={t('crossAppTrust.alerts.requestFailed')} dismissible onDismiss={() => setError('')}>
            {error}
          </PAlert>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['trusts', 'logs'] as TabKey[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {t(`crossAppTrust.tabs.${tab}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Trust list */}
        {activeTab === 'trusts' && (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            {loading ? (
              <PSkeleton.List items={4} />
            ) : trusts.length === 0 ? (
              <div className="px-6 py-16 text-center text-gray-500">
                <ArrowsRightLeftIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p>{t('crossAppTrust.empty.noTrusts')}</p>
                <PButton className="mt-4" onClick={openCreateModal}>
                  {t('crossAppTrust.actions.createFirstTrust')}
                </PButton>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.table.sourceApp')}</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500"></th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.table.targetApp')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.table.scopes')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.table.ttl')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.table.status')}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {trusts.map(trust => (
                        <tr key={trust.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {trust.source_app?.name || getAppName(trust.source_app_id)}
                          </td>
                          <td className="px-2 py-4 text-center">
                            <ArrowRightIcon className="inline h-4 w-4 text-gray-400" />
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {trust.target_app?.name || getAppName(trust.target_app_id)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={trust.allowed_scopes}>
                            <code className="rounded bg-gray-100 px-2 py-1 text-xs">{trust.allowed_scopes}</code>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{trust.max_token_ttl}s</td>
                          <td className="px-6 py-4">
                            <button onClick={() => handleToggleActive(trust)} title={trust.is_active ? t('crossAppTrust.actions.deactivate') : t('crossAppTrust.actions.activate')}>
                              <PBadge variant={trust.is_active ? 'success' : 'warning'}>
                                {trust.is_active ? t('crossAppTrust.status.active') : t('crossAppTrust.status.inactive')}
                              </PBadge>
                            </button>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(trust)}
                                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100"
                                title={t('crossAppTrust.actions.edit')}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(trust)}
                                className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                                title={t('crossAppTrust.actions.delete')}
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
                {totalTrustPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
                    <p className="text-sm text-gray-500">{t('crossAppTrust.pagination.total', { count: String(trustsTotal) })}</p>
                    <div className="flex gap-2">
                      <PButton variant="secondary" size="sm" disabled={trustsPage <= 1} onClick={() => loadTrusts(trustsPage - 1)}>
                        {t('crossAppTrust.pagination.prev')}
                      </PButton>
                      <span className="flex items-center text-sm text-gray-500">{trustsPage} / {totalTrustPages}</span>
                      <PButton variant="secondary" size="sm" disabled={trustsPage >= totalTrustPages} onClick={() => loadTrusts(trustsPage + 1)}>
                        {t('crossAppTrust.pagination.next')}
                      </PButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Logs */}
        {activeTab === 'logs' && (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            {logsLoading ? (
              <PSkeleton.List items={4} />
            ) : logs.length === 0 ? (
              <div className="px-6 py-16 text-center text-gray-500">
                <DocumentTextIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <p>{t('crossAppTrust.empty.noLogs')}</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.time')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.user')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.sourceApp')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.targetApp')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.scopes')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.status')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('crossAppTrust.logTable.ip')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(log.created_at, locale)}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{log.user?.nickname || log.user?.email || `#${log.user_id}`}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{log.source_app?.name || `#${log.source_app_id}`}</td>
                          <td className="px-6 py-4 text-sm text-gray-900">{log.target_app?.name || `#${log.target_app_id}`}</td>
                          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                            <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                              {log.status === 'granted' ? log.granted_scopes : log.requested_scopes}
                            </code>
                          </td>
                          <td className="px-6 py-4">
                            <PBadge variant={log.status === 'granted' ? 'success' : 'error'}>
                              {log.status === 'granted' ? t('crossAppTrust.logStatus.granted') : t('crossAppTrust.logStatus.denied')}
                            </PBadge>
                            {log.deny_reason && (
                              <p className="mt-1 text-xs text-red-600">{log.deny_reason}</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{log.ip || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalLogPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3">
                    <p className="text-sm text-gray-500">{t('crossAppTrust.pagination.total', { count: String(logsTotal) })}</p>
                    <div className="flex gap-2">
                      <PButton variant="secondary" size="sm" disabled={logsPage <= 1} onClick={() => loadLogs(logsPage - 1)}>
                        {t('crossAppTrust.pagination.prev')}
                      </PButton>
                      <span className="flex items-center text-sm text-gray-500">{logsPage} / {totalLogPages}</span>
                      <PButton variant="secondary" size="sm" disabled={logsPage >= totalLogPages} onClick={() => loadLogs(logsPage + 1)}>
                        {t('crossAppTrust.pagination.next')}
                      </PButton>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Create / Edit Modal */}
        {modalOpen && (
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={editingTrust ? t('crossAppTrust.modal.editTitle') : t('crossAppTrust.modal.createTitle')}
            widthClass="max-w-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {!editingTrust && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('crossAppTrust.modal.sourceApp')}</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formSourceAppId}
                      onChange={e => setFormSourceAppId(Number(e.target.value))}
                      required
                    >
                      <option value={0}>{t('crossAppTrust.modal.selectApp')}</option>
                      {apps.map(app => (
                        <option key={app.id} value={Number(app.id)}>{app.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('crossAppTrust.modal.targetApp')}</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={formTargetAppId}
                      onChange={e => setFormTargetAppId(Number(e.target.value))}
                      required
                    >
                      <option value={0}>{t('crossAppTrust.modal.selectApp')}</option>
                      {apps.filter(a => Number(a.id) !== formSourceAppId).map(app => (
                        <option key={app.id} value={Number(app.id)}>{app.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <PInput
                label={t('crossAppTrust.modal.allowedScopes')}
                value={formAllowedScopes}
                onChange={e => setFormAllowedScopes(e.target.value)}
                placeholder={t('crossAppTrust.modal.scopesPlaceholder')}
                required
              />

              <PInput
                label={t('crossAppTrust.modal.maxTokenTTL')}
                type="number"
                value={String(formMaxTokenTTL)}
                onChange={e => setFormMaxTokenTTL(Math.min(600, Math.max(60, Number(e.target.value))))}
                min={60}
                max={600}
              />

              <PInput
                label={t('crossAppTrust.modal.description')}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder={t('crossAppTrust.modal.descriptionPlaceholder')}
              />

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <PButton type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  {t('crossAppTrust.actions.cancel')}
                </PButton>
                <PButton type="submit" loading={submitting}>
                  {editingTrust ? t('crossAppTrust.actions.save') : t('crossAppTrust.actions.create')}
                </PButton>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </TenantLayout>
  )
}
