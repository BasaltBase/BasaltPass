import React, { useState, useEffect, useMemo } from 'react'
import { adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan, adminListProducts } from '@api/subscription/subscription'
import { Plan, Product } from '@types/domain/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon, PencilIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import PInput from '@ui/PInput'
import PTextarea from '@ui/PTextarea'
import PCheckbox from '@ui/PCheckbox'
import PTable, { PTableColumn, PTableAction } from '@ui/PTable'
import { ROUTES } from '@constants'

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  // 新增：租户筛选
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  // 分页状态
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [formData, setFormData] = useState({
    product_id: '',
    code: '',
    display_name: '',
    description: '',
    plan_version: 1,
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
      const [plansRes, productsRes] = await Promise.all([
        adminListPlans(params),
        adminListProducts(params)
      ])
      // 提取分页数据（兼容多种结构）
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

      // 处理套餐数据
      const plansPager = extractPager(plansRes)
      setPlans(plansPager.list)
      setTotal(plansPager.total)
      setTotalPages(plansPager.totalPages)

      // 处理产品数据（仅列表用于名称映射）
      const productsPager = extractPager(productsRes)
      setProducts(productsPager.list)
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
        product_id: parseInt(formData.product_id)
      }
      
      if (editingPlan) {
        await adminUpdatePlan(editingPlan.ID, submitData)
      } else {
        await adminCreatePlan(submitData)
      }
      setShowModal(false)
      setEditingPlan(null)
      setFormData({
        product_id: '',
        code: '',
        display_name: '',
        description: '',
        plan_version: 1,
        is_active: true
      })
      fetchData()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      product_id: plan.ProductID?.toString() || '',
      code: plan.Code || '',
      display_name: plan.DisplayName,
      description: plan.Description || '',
      plan_version: plan.PlanVersion,
      is_active: true
    })
    setShowModal(true)
  }

  const handleDeleteClick = (plan: Plan) => {
    setDeleteTarget(plan)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await adminDeletePlan(deleteTarget.ID)
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

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId)
    return product ? product.Name : '未知产品'
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
      <AdminLayout title="计划管理">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="计划管理">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">套餐管理</h1>
          <div className="flex items-center space-x-3">
            {/* 新增：租户筛选 */}
            <PSelect
              value={selectedTenantId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTenantId(e.target.value)}
            >
              <option value="">全部租户</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </PSelect>
            <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>新建套餐</PButton>
          </div>
        </div>
        {/* 套餐列表（统一表格组件） */}
        {(() => {
          const columns: PTableColumn<Plan>[] = [
            { key: 'name', title: '名称', dataIndex: 'DisplayName' as any },
            { key: 'product', title: '产品', render: (row) => getProductName(row.ProductID || 0) },
            { key: 'version', title: '版本', render: (row) => `v${row.PlanVersion}` },
            { key: 'desc', title: '描述', render: (row) => row.Description || '-' },
            { key: 'tenant', title: '租户', render: (row) => renderTenantInfo(row.TenantID as unknown as number) },
          ]

          const actions: PTableAction<Plan>[] = [
            { key: 'edit', label: '编辑', icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
            { key: 'delete', label: '删除', icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: '确定要删除该套餐吗？此操作无法撤销。', onClick: (row) => handleDeleteClick(row) },
          ]

          return (
            <PTable
              columns={columns}
              data={plans}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText="暂无套餐数据"
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
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-5 border shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingPlan ? '编辑套餐' : '新建套餐'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 第一行：产品选择和套餐代码 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">所属产品</label>
                    <PSelect
                      required
                      value={formData.product_id}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, product_id: e.target.value })}
                    >
                      <option value="">请选择产品</option>
                      {products.map((product) => (
                        <option key={product.ID} value={product.ID}>
                          {product.Name}
                        </option>
                      ))}
                    </PSelect>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">套餐代码</label>
                    <PInput
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="请输入套餐代码"
                    />
                  </div>
                </div>

                {/* 第二行：套餐名称和版本号 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">套餐名称</label>
                    <PInput
                      type="text"
                      required
                      value={formData.display_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, display_name: e.target.value })}
                      placeholder="请输入套餐名称"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">版本号</label>
                    <PInput
                      type="number"
                      min={1}
                      required
                      value={formData.plan_version}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, plan_version: parseInt(e.target.value) })}
                      placeholder="请输入版本号"
                    />
                  </div>
                </div>

                {/* 第三行：套餐描述（全宽） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">套餐描述</label>
                  <PTextarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="请输入套餐描述"
                  />
                </div>

                {/* 第四行：激活状态 */}
                <div className="flex items-center">
                  <PCheckbox
                    checked={formData.is_active}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, is_active: e.target.checked })}
                  >
                    激活状态
                  </PCheckbox>
                </div>

                {/* 按钮区域 */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false)
                      setEditingPlan(null)
                      setFormData({
                        product_id: '',
                        code: '',
                        display_name: '',
                        description: '',
                        plan_version: 1,
                        is_active: true
                      })
                    }}
                  >
                    取消
                  </PButton>
                  <PButton type="submit">
                    {editingPlan ? '更新' : '创建'}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除套餐确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                确认删除套餐
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  您确定要删除以下套餐吗？
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteTarget.DisplayName}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    产品: {getProductName(deleteTarget.ProductID || 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    版本: v{deleteTarget.PlanVersion}
                  </p>
                  {deleteTarget.Description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {deleteTarget.Description}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  删除后，该套餐及其相关的价格将无法恢复。
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