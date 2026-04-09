import React, { useEffect, useMemo, useState } from 'react'
import {
  ClipboardDocumentIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantManualApi, TenantManualApiKey } from '@api/tenant/manualApi'
import { Modal, PAlert, PBadge, PButton, PInput, PPageHeader, PSkeleton } from '@ui'
import { uiConfirm } from '@contexts/DialogContext'
import { useI18n } from '@shared/i18n'

const formatDateTime = (value: string | undefined, locale: string) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale)
}

const toDatetimeLocalValue = (value?: string) => {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function TenantAutomationTokens() {
  const { t, locale } = useI18n()
  const [keys, setKeys] = useState<TenantManualApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [createdToken, setCreatedToken] = useState('')

  const hasKeys = useMemo(() => keys.length > 0, [keys])

  const loadKeys = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await tenantManualApi.listKeys()
      setKeys(response.data || [])
    } catch (err: any) {
      setError(err.response?.data?.error || t('tenantAutomationTokens.errors.loadFailed'))
      setKeys([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const resetForm = () => {
    setName('')
    setExpiresAt('')
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return

    try {
      setSubmitting(true)
      const payload = {
        name: name.trim(),
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      }
      const response = await tenantManualApi.createKey(payload)
      setCreatedToken(response.data.key)
      setModalOpen(false)
      resetForm()
      await loadKeys()
    } catch (err: any) {
      setError(err.response?.data?.error || t('tenantAutomationTokens.errors.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (key: TenantManualApiKey) => {
    const confirmed = await uiConfirm(t('tenantAutomationTokens.confirmDelete', { name: key.name }))
    if (!confirmed) return

    try {
      await tenantManualApi.deleteKey(key.id)
      await loadKeys()
    } catch (err: any) {
      setError(err.response?.data?.error || t('tenantAutomationTokens.errors.deleteFailed'))
    }
  }

  const handleCopy = async (value: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
  }

  return (
    <TenantLayout title={t('tenantAutomationTokens.layoutTitle')}>
      <div className="space-y-6 p-6">
        <PPageHeader
          title={t('tenantAutomationTokens.title')}
          description={t('tenantAutomationTokens.description')}
          icon={<KeyIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={() => setModalOpen(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
              {t('tenantAutomationTokens.actions.createToken')}
            </PButton>
          }
        />

        <PAlert variant="info" title={t('tenantAutomationTokens.alerts.usageTitle')}>
          {t('tenantAutomationTokens.alerts.usageDescription')}
        </PAlert>

        {error && (
          <PAlert variant="error" title={t('tenantAutomationTokens.alerts.requestFailed')} dismissible onDismiss={() => setError('')}>
            {error}
          </PAlert>
        )}

        {createdToken && (
          <PAlert
            variant="success"
            title={t('tenantAutomationTokens.alerts.tokenCreated')}
            dismissible
            onDismiss={() => setCreatedToken('')}
            actions={
              <PButton variant="secondary" size="sm" onClick={() => handleCopy(createdToken)} leftIcon={<ClipboardDocumentIcon className="h-4 w-4" />}>
                {t('tenantAutomationTokens.actions.copyToken')}
              </PButton>
            }
          >
            <div className="space-y-2">
              <p>{t('tenantAutomationTokens.alerts.tokenCreatedHint')}</p>
              <code className="block overflow-x-auto rounded-lg bg-green-100 px-3 py-2 text-xs text-green-900">
                {createdToken}
              </code>
            </div>
          </PAlert>
        )}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <PSkeleton.List items={4} />
          ) : !hasKeys ? (
            <div className="px-6 py-16 text-center text-gray-500">
              <KeyIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p>{t('tenantAutomationTokens.empty.noTokens')}</p>
              <PButton className="mt-4" onClick={() => setModalOpen(true)}>
                {t('tenantAutomationTokens.actions.createFirstToken')}
              </PButton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.prefix')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.status')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.lastUsed')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.expiresAt')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.createdAt')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">{t('tenantAutomationTokens.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {keys.map((key) => {
                    const expired = key.expires_at ? new Date(key.expires_at).getTime() < Date.now() : false
                    return (
                      <tr key={key.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{key.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <code className="rounded bg-gray-100 px-2 py-1 text-xs">{key.key_prefix}</code>
                        </td>
                        <td className="px-6 py-4">
                          <PBadge variant={expired ? 'warning' : 'success'}>
                            {expired ? t('tenantAutomationTokens.status.expired') : t('tenantAutomationTokens.status.active')}
                          </PBadge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(key.last_used_at, locale)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(key.expires_at, locale)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDateTime(key.created_at, locale)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(key)}
                            className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                            title={t('tenantAutomationTokens.actions.deleteToken')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {modalOpen && (
          <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title={t('tenantAutomationTokens.modal.title')} widthClass="max-w-lg">
            <form onSubmit={handleCreate} className="space-y-5">
              <PInput
                label={t('tenantAutomationTokens.modal.tokenName')}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('tenantAutomationTokens.modal.tokenNamePlaceholder')}
                required
                autoFocus
              />

              <PInput
                label={t('tenantAutomationTokens.modal.expiresAt')}
                type="datetime-local"
                value={toDatetimeLocalValue(expiresAt)}
                onChange={(event) => setExpiresAt(event.target.value)}
              />

              <PAlert variant="warning" title={t('tenantAutomationTokens.modal.securityTitle')}>
                {t('tenantAutomationTokens.modal.securityHint')}
              </PAlert>

              <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <PButton type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm() }}>
                  {t('tenantAutomationTokens.actions.cancel')}
                </PButton>
                <PButton type="submit" loading={submitting}>
                  {t('tenantAutomationTokens.actions.createToken')}
                </PButton>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </TenantLayout>
  )
}
