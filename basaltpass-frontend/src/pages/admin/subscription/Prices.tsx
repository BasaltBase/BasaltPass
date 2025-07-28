import React, { useState, useEffect } from 'react'
import { adminListPrices, adminCreatePrice, adminUpdatePrice, adminDeletePrice, adminListPlans } from '../../../api/subscription'
import { Price, Plan } from '../../../types/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import AdminLayout from '../../../components/AdminLayout'

export default function AdminPrices() {
  const [prices, setPrices] = useState<Price[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Price | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingPrice, setEditingPrice] = useState<Price | null>(null)
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
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [pricesRes, plansRes] = await Promise.all([
        adminListPrices(),
        adminListPlans()
      ])
      
      // 处理定价数据
      const pricesRaw = pricesRes.data.Data
      let pricesList: any = []
      if (Array.isArray(pricesRaw)) pricesList = pricesRaw
      else if (Array.isArray(pricesRaw.data)) pricesList = pricesRaw.data
      else if (Array.isArray(pricesRaw.data?.Data)) pricesList = pricesRaw.data.Data
      setPrices(pricesList)

      // 处理套餐数据
      const plansRaw = plansRes.data.Data
      let plansList: any = []
      if (Array.isArray(plansRaw)) plansList = plansRaw
      else if (Array.isArray(plansRaw.data)) plansList = plansRaw.data
      else if (Array.isArray(plansRaw.data?.Data)) plansList = plansRaw.data.Data
      setPlans(plansList)
    } catch (error) {
      console.error('获取数据失败:', error)
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
      console.error('操作失败:', error)
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
      console.error('删除失败:', error)
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
    return plan ? plan.DisplayName : '未知套餐'
  }

  const getBillingPeriodText = (period: string, interval: number) => {
    const periodMap: Record<string, string> = {
      'day': '天',
      'week': '周',
      'month': '月',
      'year': '年'
    }
    return `${interval}${periodMap[period] || period}`
  }

  if (loading) {
    return (
      <AdminLayout title="价格管理">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="价格管理">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <Link to="/admin/subscriptions" className="ml-4 text-gray-400 hover:text-gray-500">
                  订阅管理
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">定价管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">定价管理</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            新建定价
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {prices && prices.length > 0 ? (
              prices.map((price) => (
                <li key={price.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {formatPrice(price.AmountCents, price.Currency)}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            套餐: {getPlanName(price.PlanID || 0)} | 
                            周期: {getBillingPeriodText(price.BillingPeriod, price.BillingInterval)} |
                            类型: {price.UsageType}
                          </p>
                          {price.TrialDays && (
                            <p className="mt-1 text-sm text-gray-500">
                              试用期: {price.TrialDays} 天
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(price)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteClick(price)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
                暂无定价数据
              </li>
            )}
          </ul>
        </div>

        {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-5 border shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingPrice ? '编辑定价' : '新建定价'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 第一行：所属套餐和价格 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">所属套餐</label>
                    <select
                      required
                      value={formData.plan_id}
                      onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">价格 (分)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.amount_cents}
                      onChange={(e) => setFormData({ ...formData, amount_cents: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="例如: 1000 表示 10.00 元"
                    />
                  </div>
                </div>

                {/* 第二行：币种和计费周期 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">币种</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="CNY">CNY</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">计费周期</label>
                    <select
                      value={formData.billing_period}
                      onChange={(e) => setFormData({ ...formData, billing_period: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="day">天</option>
                      <option value="week">周</option>
                      <option value="month">月</option>
                      <option value="year">年</option>
                    </select>
                  </div>
                </div>

                {/* 第三行：计费间隔和使用类型 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">计费间隔</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.billing_interval}
                      onChange={(e) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="请输入计费间隔"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">使用类型</label>
                    <select
                      value={formData.usage_type}
                      onChange={(e) => setFormData({ ...formData, usage_type: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="licensed">按许可证</option>
                      <option value="metered">按使用量</option>
                    </select>
                  </div>
                </div>

                {/* 第四行：试用天数和激活状态 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">试用天数（可选）</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.trial_days}
                      onChange={(e) => setFormData({ ...formData, trial_days: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="请输入试用天数"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      激活状态
                    </label>
                  </div>
                </div>

                {/* 按钮区域 */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
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
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingPrice ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除定价确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                确认删除定价
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  您确定要删除以下定价吗？
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPrice(deleteTarget!.AmountCents, deleteTarget!.Currency)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    套餐: {getPlanName(deleteTarget!.PlanID || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    周期: {getBillingPeriodText(deleteTarget!.BillingPeriod, deleteTarget!.BillingInterval)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    类型: {deleteTarget!.UsageType}
                  </p>
                  {deleteTarget!.TrialDays && (
                    <p className="text-sm text-gray-500 mt-1">
                      试用期: {deleteTarget!.TrialDays} 天
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  删除后，该定价将无法恢复，可能影响现有的订阅。
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {deleting ? '删除中...' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
} 