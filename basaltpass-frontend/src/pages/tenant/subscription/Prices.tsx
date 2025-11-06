import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TenantLayout from '@components/TenantLayout'
import {
  ChevronRightIcon,
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
import PInput from '@components/PInput'
import PSelect from '@components/PSelect'
import PButton from '@components/PButton'
import PTable, { PTableColumn, PTableAction } from '@components/PTable'

export default function TenantPrices() {
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
    
    // 检查是否需要自动打开创建模态框
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
      console.error('获取定价列表失败:', error)
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
      console.error('操作失败:', error)
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
      console.error('删除失败:', error)
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
    return plan ? plan.DisplayName : `套餐 ${planId}`
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面头部 */}
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <Link to="/tenant/subscriptions" className="text-gray-400 hover:text-gray-500">
                      订阅管理
                    </Link>
                  </li>
                  <li>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </li>
                  <li>
                    <span className="text-gray-900">定价管理</span>
                  </li>
                </ol>
              </nav>
              <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                定价管理
              </h2>
            </div>
            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>创建定价</PButton>
            </div>
          </div>

          {/* 定价列表（统一表格组件） */}
          <div className="mt-8">
            {(() => {
              const columns: PTableColumn<TenantPrice>[] = [
                { key: 'plan', title: '套餐', render: (row) => getPlanName(row.PlanID) },
                { key: 'amount', title: '价格', render: (row) => formatPrice(row.AmountCents, row.Currency) },
                { key: 'billing', title: '计费周期', render: (row) => formatBillingPeriod(row.BillingPeriod, row.BillingInterval) },
                { key: 'usage', title: '使用类型', dataIndex: 'UsageType' as any },
                { key: 'trial', title: '试用期', render: (row) => (row.TrialDays ? `${row.TrialDays} 天` : '-') },
                { key: 'created', title: '创建时间', render: (row) => new Date(row.CreatedAt).toLocaleString('zh-CN') },
              ];

              const actions: PTableAction<TenantPrice>[] = [
                { key: 'edit', label: '编辑', icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
                { key: 'delete', label: '删除', icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: '确定要删除该定价吗？', onClick: (row) => handleDeleteClick(row) },
              ];

              return (
                <PTable
                  columns={columns}
                  data={prices}
                  rowKey={(row) => row.ID}
                  actions={actions}
                  emptyText="暂无定价数据"
                  emptyContent={
                    <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>创建定价</PButton>
                  }
                  striped
                  size="md"
                />
              )
            })()}
          </div>
        </div>
      </div>

      {/* 创建/编辑定价模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {editingPrice ? '编辑定价' : '创建定价'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <PSelect
                label="套餐"
                value={formData.plan_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, plan_id: parseInt(e.target.value) })}
                required
                disabled={!!editingPrice}
              >
                <option value="">请选择套餐</option>
                {plans.map((plan) => (
                  <option key={plan.ID} value={plan.ID}>
                    {plan.DisplayName}
                  </option>
                ))}
              </PSelect>
              <PSelect
                label="货币"
                value={formData.currency}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                required
              >
                <option value="CNY">人民币 (CNY)</option>
                <option value="USD">美元 (USD)</option>
                <option value="EUR">欧元 (EUR)</option>
              </PSelect>
              <div>
                <PInput
                  label="价格（分）"
                  type="number"
                  value={formData.amount_cents}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount_cents: parseInt(e.target.value) })}
                  min={0}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  当前价格: {formatPrice(formData.amount_cents, formData.currency)}
                </p>
              </div>
              <PSelect
                label="计费周期"
                value={formData.billing_period}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, billing_period: e.target.value })}
                required
              >
                <option value="day">天</option>
                <option value="week">周</option>
                <option value="month">月</option>
                <option value="year">年</option>
              </PSelect>
              <PInput
                label="计费间隔"
                type="number"
                value={formData.billing_interval}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                min={1}
                required
              />
              <PInput
                label="试用天数（可选）"
                type="number"
                value={formData.trial_days || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, trial_days: e.target.value ? parseInt(e.target.value) : undefined })}
                min={0}
              />
              <PSelect
                label="使用类型"
                value={formData.usage_type}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, usage_type: e.target.value })}
                required
              >
                <option value="licensed">许可</option>
                <option value="metered">计量</option>
              </PSelect>
              <div className="flex justify-end space-x-3 pt-4">
                <PButton type="button" variant="secondary" onClick={handleCancel}>取消</PButton>
                <PButton type="submit">{editingPrice ? '更新' : '创建'}</PButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-center text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              确定要删除定价 "{formatPrice(deleteTarget.AmountCents, deleteTarget.Currency)}" 吗？此操作无法撤销。
            </p>
            <div className="flex justify-center space-x-3">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                取消
              </PButton>
              <PButton
                type="button"
                variant="danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '确认删除'}
              </PButton>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
