import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  TenantPrice,
  TenantPlan,
  CreateTenantPriceRequest,
  UpdateTenantPriceRequest,
} from '@api/tenant/subscription'
import { PInput, PSelect, PButton, PSkeleton, Modal, PPageHeader } from '@ui'
import PTable, { PTableColumn, PTableAction } from '@ui/PTable'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function TenantPrices() {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [prices, setPrices] = useState<TenantPrice[]>([])
  const [plans, setPlans] = useState<TenantPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingPrice, setEditingPrice] = useState<TenantPrice | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantPrice | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<CreateTenantPriceRequest>({
    plan_id: 0,
    currency: 'CNY',
    amount_cents: 0,
    billing_period: 'month',
    billing_interval: 1,
    usage_type: 'licensed',
    billing_scheme: {},
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
      const [pricesRes, plansRes] = await Promise.all([
        tenantSubscriptionAPI.adminListPrices(),
        tenantSubscriptionAPI.adminListPlans()
      ])
      setPrices(pricesRes.data || [])
      setPlans(plansRes.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionPrices.logs.loadFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPrice) {
        await tenantSubscriptionAPI.updatePrice(editingPrice.ID, formData as UpdateTenantPriceRequest)
      } else {
        await tenantSubscriptionAPI.createPrice(formData)
      }
      setShowModal(false)
      setEditingPrice(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error(t('tenantSubscriptionPrices.logs.operationFailed'), error)
    }
  }

  const handleEdit = (price: TenantPrice) => {
    setEditingPrice(price)
    setFormData({
      plan_id: price.PlanID,
      currency: price.Currency,
      amount_cents: price.AmountCents,
      billing_period: price.BillingPeriod,
      billing_interval: price.BillingInterval,
      trial_days: price.TrialDays,
      usage_type: price.UsageType,
      billing_scheme: price.BillingScheme || {},
      metadata: price.Metadata || {},
    })
    setShowModal(true)
  }

  const handleDeleteClick = (price: TenantPrice) => {
    setDeleteTarget(price)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await tenantSubscriptionAPI.deletePrice(deleteTarget.ID)
      await fetchData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('tenantSubscriptionPrices.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      plan_id: 0,
      currency: 'CNY',
      amount_cents: 0,
      billing_period: 'month',
      billing_interval: 1,
      usage_type: 'licensed',
      billing_scheme: {},
      metadata: {},
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingPrice(null)
    resetForm()
  }

  const getPlanName = (planId: number) => {
    const plan = plans.find(p => p.ID === planId)
    return plan ? plan.DisplayName : t('tenantSubscriptionPrices.fields.planWithId', { id: planId })
  }

  const formatPrice = (amountCents: number, currency: string) => {
    return tenantSubscriptionAPI.formatPrice(amountCents, currency)
  }

  const formatBillingPeriod = (period: string, interval: number) => {
    return tenantSubscriptionAPI.formatBillingPeriod(period, interval)
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
            title={t('tenantSubscriptionPrices.title')}
            description={t('tenantSubscriptionPrices.description')}
            actions={<PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPrices.actions.createPrice')}</PButton>}
          />

          {/* （） */}
          <div className="mt-8">
            {(() => {
              const columns: PTableColumn<TenantPrice>[] = [
                { key: 'plan', title: t('tenantSubscriptionPrices.table.plan'), render: (row) => getPlanName(row.PlanID) },
                { key: 'amount', title: t('tenantSubscriptionPrices.table.price'), render: (row) => formatPrice(row.AmountCents, row.Currency) },
                { key: 'billing', title: t('tenantSubscriptionPrices.table.billingPeriod'), render: (row) => formatBillingPeriod(row.BillingPeriod, row.BillingInterval) },
                { key: 'usage', title: t('tenantSubscriptionPrices.table.usageType'), dataIndex: 'UsageType' as any },
                { key: 'trial', title: t('tenantSubscriptionPrices.table.trialPeriod'), render: (row) => (row.TrialDays ? t('tenantSubscriptionPrices.fields.trialDays', { days: row.TrialDays }) : '-') },
                { key: 'created', title: t('tenantSubscriptionPrices.table.createdAt'), render: (row) => new Date(row.CreatedAt).toLocaleString(locale) },
              ];

              const actions: PTableAction<TenantPrice>[] = [
                { key: 'edit', label: t('tenantSubscriptionPrices.actions.edit'), icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
                { key: 'delete', label: t('tenantSubscriptionPrices.actions.delete'), icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: t('tenantSubscriptionPrices.deleteModal.confirmAction'), onClick: (row) => handleDeleteClick(row) },
              ];

              return (
                <PTable
                  columns={columns}
                  data={prices}
                  rowKey={(row) => row.ID}
                  actions={actions}
                  emptyText={t('tenantSubscriptionPrices.empty.table')}
                  emptyContent={
                    <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantSubscriptionPrices.actions.createPrice')}</PButton>
                  }
                  striped
                  size="md"
                />
              )
            })()}
          </div>
        </div>
      </div>

      {/* / */}
      {showModal && (
        <Modal open={showModal} onClose={handleCancel} title={editingPrice ? t('tenantSubscriptionPrices.actions.editPrice') : t('tenantSubscriptionPrices.actions.createPrice')} widthClass="max-w-md">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {editingPrice ? t('tenantSubscriptionPrices.actions.editPrice') : t('tenantSubscriptionPrices.actions.createPrice')}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PSelect
                label={t('tenantSubscriptionPrices.fields.plan')}
                value={formData.plan_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, plan_id: parseInt(e.target.value) })}
                required
                disabled={!!editingPrice}
              >
                <option value="">{t('tenantSubscriptionPrices.fields.selectPlan')}</option>
                {plans.map((plan) => (
                  <option key={plan.ID} value={plan.ID}>
                    {plan.DisplayName}
                  </option>
                ))}
              </PSelect>
              <PSelect
                label={t('tenantSubscriptionPrices.fields.currency')}
                value={formData.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <option value="CNY">{t('tenantSubscriptionPrices.currency.cny')}</option>
                <option value="USD">{t('tenantSubscriptionPrices.currency.usd')}</option>
                <option value="EUR">{t('tenantSubscriptionPrices.currency.eur')}</option>
              </PSelect>
              <div>
                <PInput
                  label={t('tenantSubscriptionPrices.fields.priceCents')}
                  type="number"
                  value={formData.amount_cents}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount_cents: parseInt(e.target.value) })}
                  min={0}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {t('tenantSubscriptionPrices.fields.currentPrice')}: {formatPrice(formData.amount_cents, formData.currency)}
                </p>
              </div>
              <PSelect
                label={t('tenantSubscriptionPrices.fields.billingPeriod')}
                value={formData.billing_period}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, billing_period: e.target.value })}
                required
              >
                <option value="day">{t('tenantSubscriptionPrices.period.day')}</option>
                <option value="week">{t('tenantSubscriptionPrices.period.week')}</option>
                <option value="month">{t('tenantSubscriptionPrices.period.month')}</option>
                <option value="year">{t('tenantSubscriptionPrices.period.year')}</option>
              </PSelect>
              <PInput
                label={t('tenantSubscriptionPrices.fields.billingInterval')}
                type="number"
                value={formData.billing_interval}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                min={1}
                required
              />
              <PInput
                label={t('tenantSubscriptionPrices.fields.trialDaysOptional')}
                type="number"
                value={formData.trial_days || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, trial_days: e.target.value ? parseInt(e.target.value) : undefined })}
                min={0}
              />
              <PSelect
                label={t('tenantSubscriptionPrices.fields.usageType')}
                value={formData.usage_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, usage_type: e.target.value })}
                required
              >
                <option value="licensed">{t('tenantSubscriptionPrices.usage.licensed')}</option>
                <option value="metered">{t('tenantSubscriptionPrices.usage.metered')}</option>
              </PSelect>
              <div className="flex justify-end space-x-3 pt-4">
                <PButton type="button" variant="secondary" onClick={handleCancel}>{t('tenantSubscriptionPrices.actions.cancel')}</PButton>
                <PButton type="submit">{editingPrice ? t('tenantSubscriptionPrices.actions.update') : t('tenantSubscriptionPrices.actions.create')}</PButton>
              </div>
            </form>
        </Modal>
      )}

      {/*  */}
      {showDeleteModal && deleteTarget && (
        <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title={t('tenantSubscriptionPrices.deleteModal.title')} widthClass="max-w-md">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-center text-gray-900 mb-2">{t('tenantSubscriptionPrices.deleteModal.title')}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t('tenantSubscriptionPrices.deleteModal.confirmMessage', { price: formatPrice(deleteTarget.AmountCents, deleteTarget.Currency) })}
            </p>
            <div className="flex justify-center space-x-3">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                {t('tenantSubscriptionPrices.actions.cancel')}
              </PButton>
              <PButton
                type="button"
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? t('tenantSubscriptionPrices.actions.deleting') : t('tenantSubscriptionPrices.actions.confirmDelete')}
              </PButton>
            </div>
        </Modal>
      )}
    </TenantLayout>
  )
}
