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
import { PInput, PSelect, PButton, PSkeleton, PBadge, Modal, PPageHeader } from '@ui'
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
          {/* 页面头部 */}
          <PPageHeader
            title="账单管理"
            description="查看并创建租户账单记录"
            actions={
              <PButton
                type="button"
                onClick={() => setShowModal(true)}
                leftIcon={<PlusIcon className="h-5 w-5" />}
              >
                创建账单
              </PButton>
            }
          />

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
                    <PBadge variant={getStatusVariant(row.status) as any}>{getStatusText(row.status)}</PBadge>
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
        <Modal open={showModal} onClose={handleCancel} title="创建账单" widthClass="max-w-md">
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
        </Modal>
      )}
    </TenantLayout>
  )
}
