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

export default function AdminPrices() {
  const [prices, setPrices] = useState<Price[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Price | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingPrice, setEditingPrice] = useState<Price | null>(null)
  // 新增：租户筛选
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  // 分页状态
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
    // 切换租户时重置到第1页
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
      console.error('获取租户列表失败:', e)
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

  const tenantMap = useMemo(() => {
    const m = new Map<number, AdminTenantResponse>()
    tenants.forEach(t => m.set(t.id, t))
    return m
  }, [tenants])

  const renderTenantInfo = (tenantId?: number) => {
    if (!tenantId) return <span className="text-gray-400">系统级</span>
    const t = tenantMap.get(tenantId)
    if (!t) return <span className="text-gray-400">租户 #{tenantId}</span>
    return (
      <span>
        租户: {t.name} ({t.code}) · 计划: {t.plan} · 状态: {t.status}
      </span>
    )
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
          <div className="flex items-center space-x-3">
            {/* 新增：租户筛选 */}
            <PSelect value={selectedTenantId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenantId(e.target.value)}>
              <option value="">全部租户</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </PSelect>
            <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>新建定价</PButton>
          </div>
        </div>
        {/* 定价列表（统一表格组件） */}
        {(() => {
          const columns: PTableColumn<Price>[] = [
            { key: 'amount', title: '价格', render: (row) => formatPrice(row.AmountCents, row.Currency) },
            { key: 'plan', title: '套餐', render: (row) => getPlanName(row.PlanID || 0) },
            { key: 'period', title: '周期', render: (row) => getBillingPeriodText(row.BillingPeriod, row.BillingInterval) },
            { key: 'type', title: '类型', render: (row) => row.UsageType },
            { key: 'trial', title: '试用期', render: (row) => row.TrialDays ? `${row.TrialDays} 天` : '-' },
            { key: 'tenant', title: '租户', render: (row) => renderTenantInfo(row.TenantID as unknown as number) },
          ]

          const actions: PTableAction<Price>[] = [
            { key: 'edit', label: '编辑', icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
            { key: 'delete', label: '删除', icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: '确定要删除该定价吗？此操作无法撤销。', onClick: (row) => handleDeleteClick(row) },
          ]

          return (
            <PTable
              columns={columns}
              data={prices}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText="暂无定价数据"
              striped
            />
          )
        })()}

        {/* 分页控件 */}
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600">共 {total} 条 · 第 {page} / {totalPages} 页</div>
          <div className="flex items-center space-x-2">
            <PButton type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>上一页</PButton>
            <PButton type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>下一页</PButton>
            <PSelect value={pageSize} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setPageSize(parseInt(e.target.value)); setPage(1) }}>
              <option value={10}>每页 10</option>
              <option value={20}>每页 20</option>
              <option value={50}>每页 50</option>
            </PSelect>
          </div>
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
                    <PSelect
                      required
                      value={formData.plan_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, plan_id: e.target.value })}
                    >
                      <option value="">请选择套餐</option>
                      {plans.map((plan) => (
                        <option key={plan.ID} value={plan.ID}>
                          {plan.DisplayName}
                        </option>
                      ))}
                    </PSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">价格 (分)</label>
                    <PInput
                      type="number"
                      required
                      min={0}
                      value={formData.amount_cents}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, amount_cents: e.target.value })}
                      placeholder="例如: 1000 表示 10.00 元"
                    />
                  </div>
                </div>

                {/* 第二行：币种和计费周期 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">币种</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">计费周期</label>
                    <PSelect
                      value={formData.billing_period}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, billing_period: e.target.value })}
                    >
                      <option value="day">天</option>
                      <option value="week">周</option>
                      <option value="month">月</option>
                      <option value="year">年</option>
                    </PSelect>
                  </div>
                </div>

                {/* 第三行：计费间隔和使用类型 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">计费间隔</label>
                    <PInput
                      type="number"
                      required
                      min={1}
                      value={formData.billing_interval}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, billing_interval: parseInt(e.target.value) })}
                      placeholder="请输入计费间隔"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">使用类型</label>
                    <PSelect
                      value={formData.usage_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, usage_type: e.target.value })}
                    >
                      <option value="licensed">按许可证</option>
                      <option value="metered">按使用量</option>
                    </PSelect>
                  </div>
                </div>

                {/* 第四行：试用天数和激活状态 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">试用天数（可选）</label>
                    <PInput
                      type="number"
                      min={0}
                      value={formData.trial_days}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, trial_days: e.target.value })}
                      placeholder="请输入试用天数"
                    />
                  </div>
                  <div className="flex items-center">
                    <PCheckbox
                      checked={formData.is_active}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                    >
                      激活状态
                    </PCheckbox>
                  </div>
                </div>

                {/* 按钮区域 */}
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
                    取消
                  </PButton>
                  <PButton type="submit">{editingPrice ? '更新' : '创建'}</PButton>
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
                <PButton type="button" variant="secondary" onClick={handleDeleteCancel} disabled={deleting}>取消</PButton>
                <PButton type="button" variant="danger" onClick={handleDeleteConfirm} disabled={deleting}>{deleting ? '删除中...' : '确认删除'}</PButton>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
}