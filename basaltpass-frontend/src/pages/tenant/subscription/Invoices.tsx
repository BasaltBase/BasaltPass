import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TenantLayout from '@components/TenantLayout'
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

export default function TenantInvoices() {
  const [searchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<TenantInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState<CreateTenantInvoiceRequest>({
    customer_id: 0,
    currency: 'CNY',
    total_cents: 0,
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
      const data = await tenantSubscriptionAPI.adminListInvoices()
      setInvoices(data.data || [])
    } catch (error) {
      console.error('获取账单列表失败:', error)
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
      console.error('创建账单失败:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      customer_id: 0,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800'
      case 'posted':
        return 'bg-blue-100 text-blue-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'void':
        return 'bg-red-100 text-red-800'
      case 'uncollectible':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return '已支付'
      case 'posted':
        return '已发布'
      case 'draft':
        return '草稿'
      case 'void':
        return '已作废'
      case 'uncollectible':
        return '无法收取'
      default:
        return status
    }
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
                    <span className="text-gray-900">账单管理</span>
                  </li>
                </ol>
              </nav>
              <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                账单管理
              </h2>
            </div>
            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                创建账单
              </button>
            </div>
          </div>

          {/* 账单列表 */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    暂无账单数据
                  </li>
                ) : (
                  invoices.map((invoice) => (
                    <li key={invoice.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-10 w-10 text-gray-400 mr-3" />
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <p className="text-lg font-medium text-gray-900">
                                  账单 #{invoice.id}
                                </p>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                                  {getStatusText(invoice.status)}
                                </span>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                <span>客户ID: {invoice.customer_id}</span>
                                <span>总金额: {formatPrice(invoice.total_cents, invoice.currency)}</span>
                                {invoice.subscription_id && (
                                  <span>订阅ID: {invoice.subscription_id}</span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-4">
                                  <span>创建时间: {new Date(invoice.created_at).toLocaleString('zh-CN')}</span>
                                  {invoice.due_at && (
                                    <span>到期时间: {new Date(invoice.due_at).toLocaleString('zh-CN')}</span>
                                  )}
                                  {invoice.paid_at && (
                                    <span>支付时间: {new Date(invoice.paid_at).toLocaleString('zh-CN')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
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

      {/* 创建账单模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              创建账单
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">客户ID</label>
                <input
                  type="number"
                  value={formData.customer_id || ''}
                  onChange={(e) => setFormData({...formData, customer_id: parseInt(e.target.value) || 0})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">订阅ID（可选）</label>
                <input
                  type="number"
                  value={formData.subscription_id || ''}
                  onChange={(e) => setFormData({...formData, subscription_id: e.target.value ? parseInt(e.target.value) : undefined})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
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
                <label className="block text-sm font-medium text-gray-700">总金额（分）</label>
                <input
                  type="number"
                  value={formData.total_cents}
                  onChange={(e) => setFormData({...formData, total_cents: parseInt(e.target.value) || 0})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="0"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  当前金额: {formatPrice(formData.total_cents, formData.currency)}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">到期时间（可选）</label>
                <input
                  type="datetime-local"
                  value={formData.due_at || ''}
                  onChange={(e) => setFormData({...formData, due_at: e.target.value || undefined})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
