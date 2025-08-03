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
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                创建定价
              </button>
            </div>
          </div>

          {/* 定价列表 */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {prices.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    暂无定价数据
                  </li>
                ) : (
                  prices.map((price) => (
                    <li key={price.ID} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <p className="text-lg font-medium text-gray-900">
                                {formatPrice(price.AmountCents, price.Currency)}
                              </p>
                              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                <span>套餐: {getPlanName(price.PlanID)}</span>
                                <span>计费周期: {formatBillingPeriod(price.BillingPeriod, price.BillingInterval)}</span>
                                <span>使用类型: {price.UsageType}</span>
                                {price.TrialDays && (
                                  <span>试用期: {price.TrialDays}天</span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                创建时间: {new Date(price.CreatedAt).toLocaleString('zh-CN')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(price)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="编辑"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(price)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="删除"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700">套餐</label>
                <select
                  value={formData.plan_id}
                  onChange={(e) => setFormData({...formData, plan_id: parseInt(e.target.value)})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={!!editingPrice}
                >
                  <option value="">请选择套餐</option>
                  {plans.map((plan) => (
                    <option key={plan.ID} value={plan.ID}>
                      {plan.DisplayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">货币</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">价格（分）</label>
                <input
                  type="number"
                  value={formData.amount_cents}
                  onChange={(e) => setFormData({...formData, amount_cents: parseInt(e.target.value)})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  当前价格: {formatPrice(formData.amount_cents, formData.currency)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">计费周期</label>
                <select
                  value={formData.billing_period}
                  onChange={(e) => setFormData({...formData, billing_period: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="day">天</option>
                  <option value="week">周</option>
                  <option value="month">月</option>
                  <option value="year">年</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">计费间隔</label>
                <input
                  type="number"
                  value={formData.billing_interval}
                  onChange={(e) => setFormData({...formData, billing_interval: parseInt(e.target.value)})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">试用天数（可选）</label>
                <input
                  type="number"
                  value={formData.trial_days || ''}
                  onChange={(e) => setFormData({...formData, trial_days: e.target.value ? parseInt(e.target.value) : undefined})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">使用类型</label>
                <select
                  value={formData.usage_type}
                  onChange={(e) => setFormData({...formData, usage_type: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="licensed">许可</option>
                  <option value="metered">计量</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingPrice ? '更新' : '创建'}
                </button>
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
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
