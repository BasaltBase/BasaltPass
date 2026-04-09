import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  ChevronRightIcon,
  PlusIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  TenantInvoice,
  CreateTenantInvoiceRequest,
} from '@api/tenant/subscription'
import { useI18n } from '@shared/i18n'
import { PInput, PSelect, PButton, PSkeleton, PBadge, Modal, PPageHeader } from '@ui'
import PTable, { PTableColumn } from '@ui/PTable'
import { ROUTES } from '@constants'

export default function TenantInvoices() {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<TenantInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<CreateTenantInvoiceRequest>({
    user_id: 0,
    currency: 'CNY',
    total_cents: 0,
    metadata: {},
  })

  useEffect(() => {
    fetchData()
    
    // 
    if (searchParams.get('action') === 'create') {
      setShowModal(true)
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await tenantSubscriptionAPI.adminListInvoices()
      setInvoices(data.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionInvoices.logs.fetchFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await tenantSubscriptionAPI.createInvoice(formData)
      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error(t('tenantSubscriptionInvoices.logs.createFailed'), error)
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: 0,
      currency: 'CNY',
      total_cents: 0,
      metadata: {},
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    resetForm()
  }

  const formatPrice = (amountCents: number, currency: string) => {
    return tenantSubscriptionAPI.formatPrice(amountCents, currency)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success'
      case 'posted': return 'info'
      case 'draft': return 'default'
      case 'void': return 'error'
      case 'uncollectible': return 'orange'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return t('tenantSubscriptionInvoices.status.paid')
      case 'posted':
        return t('tenantSubscriptionInvoices.status.posted')
      case 'draft':
        return t('tenantSubscriptionInvoices.status.draft')
      case 'void':
        return t('tenantSubscriptionInvoices.status.void')
      case 'uncollectible':
        return t('tenantSubscriptionInvoices.status.uncollectible')
      default:
        return status
    }
  }

  if (loading) {
    return (
      <TenantLayout>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/*  */}
          <PPageHeader
            title={t('tenantSubscriptionInvoices.header.title')}
            description={t('tenantSubscriptionInvoices.header.description')}
            actions={
              <PButton
                type="button"
                onClick={() => setShowModal(true)}
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                {t('tenantSubscriptionInvoices.actions.createInvoice')}
              </PButton>
            }
          />

          {/* （） */}
          <div className="mt-8">
            {(() => {
              const columns: PTableColumn<TenantInvoice>[] = [
                {
                  key: 'invoice',
                  title: t('tenantSubscriptionInvoices.table.invoice'),
                  render: (row) => (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <span className="ml-2 font-medium">#{row.id}</span>
                    </div>
                  )
                },
                { key: 'user', title: t('tenantSubscriptionInvoices.table.customerId'), dataIndex: 'user_id' as any },
                {
                  key: 'amount',
                  title: t('tenantSubscriptionInvoices.table.totalAmount'),
                  render: (row) => formatPrice(row.total_cents, row.currency)
                },
                {
                  key: 'subscription',
                  title: t('tenantSubscriptionInvoices.table.subscriptionId'),
                  render: (row) => row.subscription_id ? String(row.subscription_id) : '-'
                },
                {
                  key: 'status',
                  title: t('tenantSubscriptionInvoices.table.status'),
                  render: (row) => (
                    <PBadge variant={getStatusVariant(row.status) as any}>{getStatusText(row.status)}</PBadge>
                  )
                },
                { key: 'created', title: t('tenantSubscriptionInvoices.table.createdAt'), render: (row) => new Date(row.created_at).toLocaleString(locale) },
                { key: 'due', title: t('tenantSubscriptionInvoices.table.dueAt'), render: (row) => row.due_at ? new Date(row.due_at).toLocaleString(locale) : '-' },
                { key: 'paid', title: t('tenantSubscriptionInvoices.table.paidAt'), render: (row) => row.paid_at ? new Date(row.paid_at).toLocaleString(locale) : '-' },
              ];

              return (
                <PTable
                  columns={columns}
                  data={invoices}
                  rowKey={(row) => row.id}
                  emptyText={t('tenantSubscriptionInvoices.empty.noData')}
                  emptyContent={
                    <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionInvoices.actions.createInvoice')}</PButton>
                  }
                  striped
                  size="md"
                />
              );
            })()}
          </div>
        </div>
      </div>

      {/*  */}
      {showModal && (
        <Modal open={showModal} onClose={handleCancel} title={t('tenantSubscriptionInvoices.modal.title')} widthClass="max-w-md">
            <form onSubmit={handleSubmit} className="space-y-4">
              <PInput
                label={t('tenantSubscriptionInvoices.modal.customerIdLabel')}
                type="number"
                value={formData.user_id || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                  ...formData,
                  user_id: parseInt(e.target.value) || 0,
                })}
                min={1}
                required
              />
              <PInput
                label={t('tenantSubscriptionInvoices.modal.subscriptionIdLabel')}
                type="number"
                value={formData.subscription_id ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                  ...formData,
                  subscription_id: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })}
                min={1}
              />
              <PSelect
                label={t('tenantSubscriptionInvoices.modal.currencyLabel')}
                value={formData.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <option value="CNY">{t('tenantSubscriptionInvoices.modal.currencyCny')}</option>
                <option value="USD">{t('tenantSubscriptionInvoices.modal.currencyUsd')}</option>
                <option value="EUR">{t('tenantSubscriptionInvoices.modal.currencyEur')}</option>
              </PSelect>
              <div>
                <PInput
                  label={t('tenantSubscriptionInvoices.modal.totalCentsLabel')}
                  type="number"
                  value={formData.total_cents}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                    ...formData,
                    total_cents: parseInt(e.target.value) || 0,
                  })}
                  min={0}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('tenantSubscriptionInvoices.modal.currentAmount')}: {formatPrice(formData.total_cents, formData.currency)}
                </p>
              </div>
              <PInput
                label={t('tenantSubscriptionInvoices.modal.dueAtLabel')}
                type="datetime-local"
                value={formData.due_at || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({
                  ...formData,
                  due_at: e.target.value || undefined,
                })}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <PButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  {t('tenantSubscriptionInvoices.actions.cancel')}
                </PButton>
                <PButton type="submit">{t('tenantSubscriptionInvoices.actions.create')}</PButton>
              </div>
            </form>
        </Modal>
      )}
    </TenantLayout>
  )
}
