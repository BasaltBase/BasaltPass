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
import PInput from '@ui/PInput'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import PTable, { PTableColumn } from '@ui/PTable'
import { ROUTES } from '@constants'

export default function TenantInvoices() {
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
                    <Link to={ROUTES.tenant.subscriptions} className="text-gray-400 hover:text-gray-500">
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
              <PButton
                type="button"
                onClick={() => setShowModal(true)}
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                创建账单
              </PButton>
            </div>
          </div>

          {/* 账单列表（统一表格组件） */}
          <div className="mt-8">
            {(() => {
              const columns: PTableColumn<TenantInvoice>[] = [
                {
                  key: 'invoice',
                  title: '账单',
                  render: (row) => (
                    <div className="flex items-center">
                      <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                      <span className="ml-2 font-medium">#{row.id}</span>
                    </div>
                  )
                },
                { key: 'user', title: '客户ID', dataIndex: 'user_id' as any },
                {
                  key: 'amount',
                  title: '总金额',
                  render: (row) => formatPrice(row.total_cents, row.currency)
                },
                {
                  key: 'subscription',
                  title: '订阅ID',
                  render: (row) => row.subscription_id ? String(row.subscription_id) : '-'
                },
                {
                  key: 'status',
                  title: '状态',
                  render: (row) => (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
                      {getStatusText(row.status)}
                    </span>
                  )
                },
                { key: 'created', title: '创建时间', render: (row) => new Date(row.created_at).toLocaleString('zh-CN') },
                { key: 'due', title: '到期时间', render: (row) => row.due_at ? new Date(row.due_at).toLocaleString('zh-CN') : '-' },
                { key: 'paid', title: '支付时间', render: (row) => row.paid_at ? new Date(row.paid_at).toLocaleString('zh-CN') : '-' },
              ];

              return (
                <PTable
                  columns={columns}
                  data={invoices}
                  rowKey={(row) => row.id}
                  emptyText="暂无账单数据"
                  emptyContent={
                    <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>创建账单</PButton>
                  }
                  striped
                  size="md"
                />
              );
            })()}
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
              <PInput
                label="客户ID"
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
                label="订阅ID（可选）"
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
                  label="总金额（分）"
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
                  当前金额: {formatPrice(formData.total_cents, formData.currency)}
                </p>
              </div>
              <PInput
                label="到期时间（可选）"
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
                  取消
                </PButton>
                <PButton type="submit">创建</PButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
