import React, { useState, useEffect, useMemo } from 'react'
import { adminListPrices, adminCreatePrice, adminUpdatePrice, adminDeletePrice, adminListPlans } from '@api/subscription/subscription'
import { Price, Plan } from '@types/domain/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import PInput from '@ui/PInput'
import PCheckbox from '@ui/PCheckbox'
import PTable, { PTableColumn, PTableAction } from '@ui/PTable'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function AdminPrices() {
  const { t } = useI18n()
  const [prices, setPrices] = useState<Price[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Price | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingPrice, setEditingPrice] = useState<Price | null>(null)
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [formData, setFormData] = useState({
    plan_id: '',
    amount_cents: '',
    currency: 'CNY',
    billing_period: 'month',
    billing_interval: 1,
    usage_type: 'licensed',
    trial_days: '',
    is_active: true
  })

  useEffect(() => {
    fetchTenants()
    fetchData()
  }, [])

  useEffect(() => {
    setPage(1)
  }, [selectedTenantId])

  useEffect(() => {
    fetchData()
  }, [selectedTenantId, page, pageSize])

  const fetchTenants = async () => {
    try {
      const res = await adminTenantApi.getTenantList({ page: 1, limit: 1000 })
      setTenants(res.tenants || [])
    } catch (e) {
      console.error(t('adminSubscriptionPrices.logs.fetchTenantsFailed'), e)
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
  const params: any = {}
      if (selectedTenantId) params.tenant_id = parseInt(selectedTenantId)
  params.page = page
  params.page_size = pageSize
      const [pricesRes, plansRes] = await Promise.all([
        adminListPrices(params),
        adminListPlans(params)
      ])
      const extractPager = (body: any) => {
        const p = body?.data ?? body?.Data ?? body
        const list = Array.isArray(p?.data)
          ? p.data
          : Array.isArray(p?.Data)
          ? p.Data
          : Array.isArray(body?.data?.data)
          ? body.data.data
          : Array.isArray(body?.data?.Data)
          ? body.data.Data
          : []
        const total = p?.total ?? p?.Total ?? body?.data?.total ?? 0
        const pageVal = p?.page ?? p?.Page ?? body?.data?.page ?? 1
        const pageSizeVal = p?.page_size ?? p?.PageSize ?? body?.data?.page_size ?? 20
        const totalPagesVal = p?.total_pages ?? p?.TotalPages ?? body?.data?.total_pages ?? Math.ceil((total || 0) / (pageSizeVal || 1))
        return { list, total, page: pageVal, pageSize: pageSizeVal, totalPages: totalPagesVal }
      }

      const pricesPager = extractPager(pricesRes)
      setPrices(pricesPager.list)
      setTotal(pricesPager.total)
      setTotalPages(pricesPager.totalPages)

      const plansPager = extractPager(plansRes)
      setPlans(plansPager.list)
    } catch (error) {
      console.error(t('adminSubscriptionPrices.logs.fetchDataFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        plan_id: parseInt(formData.plan_id),
        amount_cents: parseInt(formData.amount_cents),
        trial_days: formData.trial_days ? parseInt(formData.trial_days) : null
      }
      
      if (editingPrice) {
        await adminUpdatePrice(editingPrice.ID, submitData)
      } else {
        await adminCreatePrice(submitData)
      }
      setShowModal(false)
      setEditingPrice(null)
      setFormData({
        plan_id: '',
        amount_cents: '',
        currency: 'CNY',
        billing_period: 'month',
        billing_interval: 1,
        usage_type: 'licensed',
        trial_days: '',
        is_active: true
      })
      fetchData()
    } catch (error) {
      console.error(t('adminSubscriptionPrices.logs.operationFailed'), error)
    }
  }

  const handleEdit = (price: Price) => {
    setEditingPrice(price)
    setFormData({
      plan_id: price.PlanID?.toString() || '',
      amount_cents: price.AmountCents.toString(),
      currency: price.Currency,
      billing_period: price.BillingPeriod,
      billing_interval: price.BillingInterval,
      usage_type: price.UsageType,
      trial_days: price.TrialDays?.toString() || '',
      is_active: true
    })
    setShowModal(true)
  }

  const handleDeleteClick = (price: Price) => {
    setDeleteTarget(price)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await adminDeletePrice(deleteTarget.ID)
      await fetchData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('adminSubscriptionPrices.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const formatPrice = (amountCents: number, currency: string) => {
    return `${(amountCents / 100).toFixed(2)} ${currency}`
  }

  const getPlanName = (planId: number) => {
    const plan = plans.find(p => p.ID === planId)
    return plan ? plan.DisplayName : t('adminSubscriptionPrices.common.unknownPlan')
  }

  const getBillingPeriodText = (period: string, interval: number) => {
    const periodMap: Record<string, string> = {
      'day': t('adminSubscriptionPrices.period.day'),
      'week': t('adminSubscriptionPrices.period.week'),
      'month': t('adminSubscriptionPrices.period.month'),
      'year': t('adminSubscriptionPrices.period.year')
    }
    return `${interval}${periodMap[period] || period}`
  }

  const tenantMap = useMemo(() => {
    const m = new Map<number, AdminTenantResponse>()
    tenants.forEach(tenantItem => m.set(tenantItem.id, tenantItem))
    return m
  }, [tenants])

  const renderTenantInfo = (tenantId?: number) => {
    if (!tenantId) return <span className="text-gray-400">{t('adminSubscriptionPrices.tenant.systemLevel')}</span>
    const tenant = tenantMap.get(tenantId)
    if (!tenant) return <span className="text-gray-400">{t('adminSubscriptionPrices.tenant.tenantId', { id: tenantId })}</span>
    return (
      <span>
        {t('adminSubscriptionPrices.tenant.summary', { name: tenant.name, code: tenant.code, plan: tenant.plan, status: tenant.status })}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout title={t('adminSubscriptionPrices.layoutTitle')}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">{t('adminSubscriptionPrices.common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminSubscriptionPrices.layoutTitle')}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('adminSubscriptionPrices.title')}</h1>
          <div className="flex items-center space-x-3">
            <PSelect value={selectedTenantId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenantId(e.target.value)}>
              <option value="">{t('adminSubscriptionPrices.filters.allTenants')}</option>
              {tenants.map(tenantItem => (
                <option key={tenantItem.id} value={tenantItem.id}>{tenantItem.name} ({tenantItem.code})</option>
              ))}
            </PSelect>
            <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('adminSubscriptionPrices.actions.createPrice')}</PButton>
          </div>
        </div>
        {(() => {
          const columns: PTableColumn<Price>[] = [
            { key: 'amount', title: t('adminSubscriptionPrices.table.price'), render: (row) => formatPrice(row.AmountCents, row.Currency) },
            { key: 'plan', title: t('adminSubscriptionPrices.table.plan'), render: (row) => getPlanName(row.PlanID || 0) },
            { key: 'period', title: t('adminSubscriptionPrices.table.period'), render: (row) => getBillingPeriodText(row.BillingPeriod, row.BillingInterval) },
            { key: 'type', title: t('adminSubscriptionPrices.table.type'), render: (row) => row.UsageType },
            { key: 'trial', title: t('adminSubscriptionPrices.table.trial'), render: (row) => row.TrialDays ? t('adminSubscriptionPrices.table.trialDays', { days: row.TrialDays }) : '-' },
            { key: 'tenant', title: t('adminSubscriptionPrices.table.tenant'), render: (row) => renderTenantInfo(row.TenantID as unknown as number) },
          ]

          const actions: PTableAction<Price>[] = [
            { key: 'edit', label: t('adminSubscriptionPrices.actions.edit'), icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
            { key: 'delete', label: t('adminSubscriptionPrices.actions.delete'), icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: t('adminSubscriptionPrices.confirm.deletePrice'), onClick: (row) => handleDeleteClick(row) },
          ]

          return (
            <PTable
              columns={columns}
              data={prices}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText={t('adminSubscriptionPrices.empty.noPrices')}
              striped
            />
          )
        })()}

        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600">{t('adminSubscriptionPrices.pagination.summary', { total, page, totalPages })}</div>
          <div className="flex items-center space-x-2">
            <PButton type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>{t('adminSubscriptionPrices.pagination.prev')}</PButton>
            <PButton type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('adminSubscriptionPrices.pagination.next')}</PButton>
            <PSelect value={pageSize} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setPageSize(parseInt(e.target.value)); setPage(1) }}>
              <option value={10}>{t('adminSubscriptionPrices.pagination.pageSize', { size: 10 })}</option>
              <option value={20}>{t('adminSubscriptionPrices.pagination.pageSize', { size: 20 })}</option>
              <option value={50}>{t('adminSubscriptionPrices.pagination.pageSize', { size: 50 })}</option>
            </PSelect>
          </div>
        </div>

        {showModal && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-5 border shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingPrice ? t('adminSubscriptionPrices.modal.editTitle') : t('adminSubscriptionPrices.modal.createTitle')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.plan')}</label>
                    <PSelect
                      required
                      value={formData.plan_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, plan_id: e.target.value })}
                    >
                      <option value="">{t('adminSubscriptionPrices.form.selectPlan')}</option>
                      {plans.map((plan) => (
                        <option key={plan.ID} value={plan.ID}>
                          {plan.DisplayName}
                        </option>
                      ))}
                    </PSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.amountCents')}</label>
                    <PInput
                      type="number"
                      required
                      min={0}
                      value={formData.amount_cents}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount_cents: e.target.value })}
                      placeholder={t('adminSubscriptionPrices.form.amountPlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.currency')}</label>
                    <PSelect
                      value={formData.currency}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                    >
                      <option value="CNY">CNY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </PSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.billingPeriod')}</label>
                    <PSelect
                      value={formData.billing_period}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, billing_period: e.target.value })}
                    >
                      <option value="day">{t('adminSubscriptionPrices.period.day')}</option>
                      <option value="week">{t('adminSubscriptionPrices.period.week')}</option>
                      <option value="month">{t('adminSubscriptionPrices.period.month')}</option>
                      <option value="year">{t('adminSubscriptionPrices.period.year')}</option>
                    </PSelect>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.billingInterval')}</label>
                    <PInput
                      type="number"
                      required
                      min={1}
                      value={formData.billing_interval}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                      placeholder={t('adminSubscriptionPrices.form.billingIntervalPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.usageType')}</label>
                    <PSelect
                      value={formData.usage_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, usage_type: e.target.value })}
                    >
                      <option value="licensed">{t('adminSubscriptionPrices.usageType.licensed')}</option>
                      <option value="metered">{t('adminSubscriptionPrices.usageType.metered')}</option>
                    </PSelect>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionPrices.form.trialDays')}</label>
                    <PInput
                      type="number"
                      min={0}
                      value={formData.trial_days}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, trial_days: e.target.value })}
                      placeholder={t('adminSubscriptionPrices.form.trialDaysPlaceholder')}
                    />
                  </div>
                  <div className="flex items-center">
                    <PCheckbox
                      checked={formData.is_active}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                    >
                      {t('adminSubscriptionPrices.form.activeStatus')}
                    </PCheckbox>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPrice(null)
                      setFormData({
                        plan_id: '',
                        amount_cents: '',
                        currency: 'CNY',
                        billing_period: 'month',
                        billing_interval: 1,
                        usage_type: 'licensed',
                        trial_days: '',
                        is_active: true
                      })
                    }}
                  >
                    {t('adminSubscriptionPrices.actions.cancel')}
                  </PButton>
                  <PButton type="submit">{editingPrice ? t('adminSubscriptionPrices.actions.update') : t('adminSubscriptionPrices.actions.create')}</PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {t('adminSubscriptionPrices.deleteModal.title')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('adminSubscriptionPrices.deleteModal.confirmText')}
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPrice(deleteTarget!.AmountCents, deleteTarget!.Currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionPrices.deleteModal.plan', { plan: getPlanName(deleteTarget!.PlanID || 0) })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionPrices.deleteModal.period', { period: getBillingPeriodText(deleteTarget!.BillingPeriod, deleteTarget!.BillingInterval) })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionPrices.deleteModal.type', { type: deleteTarget!.UsageType })}
                  </p>
                  {deleteTarget!.TrialDays && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t('adminSubscriptionPrices.deleteModal.trialDays', { days: deleteTarget!.TrialDays })}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {t('adminSubscriptionPrices.deleteModal.warning')}
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton type="button" variant="secondary" onClick={handleDeleteCancel} disabled={deleting}>{t('adminSubscriptionPrices.actions.cancel')}</PButton>
                <PButton type="button" variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? t('adminSubscriptionPrices.deleteModal.deleting') : t('adminSubscriptionPrices.deleteModal.confirmDelete')}</PButton>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
}