import React, { useState, useEffect, useMemo } from 'react'
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '@api/subscription/subscription'
import { Product } from '@types/domain/subscription'
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

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  // 新增：租户筛选相关状态
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')
  // 分页状态
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(20)
  const [total, setTotal] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    fetchTenants()
    fetchProducts()
  }, [])

  // 当切换租户筛选时，刷新列表
  useEffect(() => {
    // 切换租户时重置到第1页
    setPage(1)
  }, [selectedTenantId])

  useEffect(() => {
    fetchProducts()
  }, [selectedTenantId, page, pageSize])

  const fetchTenants = async () => {
    try {
      const res = await adminTenantApi.getTenantList({ page: 1, limit: 1000 })
      setTenants(res.tenants || [])
    } catch (e) {
      console.error('获取租户列表失败:', e)
    }
  }

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedTenantId) params.tenant_id = parseInt(selectedTenantId)
      params.page = page
      params.page_size = pageSize
      const res = await adminListProducts(params)
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
      const pager = extractPager(res)
      setProducts(pager.list)
      setTotal(pager.total)
      setTotalPages(pager.totalPages)
    } catch (error) {
      console.error('获取产品列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await adminUpdateProduct(editingProduct.ID, formData)
      } else {
        await adminCreateProduct(formData)
      }
      setShowModal(false)
      setEditingProduct(null)
      setFormData({ code: '', name: '', description: '', is_active: true })
      fetchProducts()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      code: product.Code,
      name: product.Name,
      description: product.Description || '',
      is_active: true // 假设默认激活
    })
    setShowModal(true)
  }

  const handleDeleteClick = (product: Product) => {
    setDeleteTarget(product)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await adminDeleteProduct(deleteTarget.ID)
      await fetchProducts()
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
      <AdminLayout title="产品管理">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="产品管理">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to={ROUTES.admin.dashboard} className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <Link to={ROUTES.admin.subscriptions} className="ml-4 text-gray-400 hover:text-gray-500">
                  订阅管理
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">产品管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">产品管理</h1>
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
            <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>新建产品</PButton>
          </div>
        </div>
        {/* 产品列表（统一表格组件） */}
        {(() => {
          const columns: PTableColumn<Product>[] = [
            { key: 'name', title: '名称', dataIndex: 'Name' as any },
            { key: 'code', title: '代码', dataIndex: 'Code' as any },
            { key: 'desc', title: '描述', render: (row) => row.Description || '-' },
            { key: 'tenant', title: '租户', render: (row) => renderTenantInfo(row.TenantID as unknown as number) },
          ]

          const actions: PTableAction<Product>[] = [
            { key: 'edit', label: '编辑', icon: <PencilIcon className="h-4 w-4" />, variant: 'secondary', size: 'sm', onClick: (row) => handleEdit(row) },
            { key: 'delete', label: '删除', icon: <TrashIcon className="h-4 w-4" />, variant: 'danger', size: 'sm', confirm: '确定要删除该产品吗？此操作无法撤销。', onClick: (row) => handleDeleteClick(row) },
          ]

          return (
            <PTable
              columns={columns}
              data={products}
              rowKey={(row) => row.ID}
              actions={actions}
              emptyText="暂无产品数据"
              striped
            />
          )
        })()}

        {/* 分页控件 */}
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600">共 {total} 条 · 第 {page} / {totalPages} 页</div>
          <div className="flex items-center space-x-2">
            <PButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >上一页</PButton>
            <PButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >下一页</PButton>
            <PSelect
              value={pageSize}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setPageSize(parseInt(e.target.value)); setPage(1) }}
            >
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
                {editingProduct ? '编辑产品' : '新建产品'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 第一行：产品代码和产品名称 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">产品代码</label>
                    <PInput
                      type="text"
                      required
                      disabled={!!editingProduct}
                      value={formData.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, code: e.target.value })}
                      placeholder="请输入产品代码"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">产品名称</label>
                    <PInput
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="请输入产品名称"
                    />
                  </div>
                </div>

                {/* 第二行：产品描述（全宽） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品描述</label>
                  <PTextarea
                    value={formData.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    placeholder="请输入产品描述"
                  />
                </div>

                {/* 第三行：激活状态 */}
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
                      setEditingProduct(null)
                      setFormData({ code: '', name: '', description: '', is_active: true })
                    }}
                  >
                    取消
                  </PButton>
                  <PButton type="submit">
                    {editingProduct ? '更新' : '创建'}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除产品确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                确认删除产品
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  您确定要删除以下产品吗？
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteTarget.Name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    代码: {deleteTarget.Code}
                  </p>
                  {deleteTarget.Description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {deleteTarget.Description}
                    </p>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  删除后，该产品及其相关的套餐和价格将无法恢复。
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton
                  type="button"
                  variant="secondary"
                  onClick={handleDeleteCancel}
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
        </div>
      )}
      </div>
    </AdminLayout>
  )
}