import React, { useState, useEffect, useMemo } from 'react'
import { adminListProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '@api/subscription/subscription'
import { Product } from '../../../types/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import AdminLayout from '../../../components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'

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
                <span className="ml-4 text-sm font-medium text-gray-500">产品管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">产品管理</h1>
          <div className="flex items-center space-x-3">
            {/* 新增：租户筛选 */}
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">全部租户</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              新建产品
            </button>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {products && products.length > 0 ? (
              products.map((product) => (
                <li key={product.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {product.Name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            代码: {product.Code}
                          </p>
                          {product.Description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {product.Description}
                            </p>
                          )}
                          {/* 新增：租户信息 */}
                          <p className="mt-1 text-xs text-gray-500">
                            {renderTenantInfo(product.TenantID as unknown as number)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
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
                暂无产品数据
              </li>
            )}
          </ul>
        </div>

        {/* 分页控件 */}
        <div className="flex items-center justify-between py-3">
          <div className="text-sm text-gray-600">共 {total} 条 · 第 {page} / {totalPages} 页</div>
          <div className="flex items-center space-x-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >上一页</button>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >下一页</button>
            <select
              className="ml-2 px-2 py-1 border rounded"
              value={pageSize}
              onChange={(e) => { setPageSize(parseInt(e.target.value)); setPage(1) }}
            >
              <option value={10}>每页 10</option>
              <option value={20}>每页 20</option>
              <option value={50}>每页 50</option>
            </select>
          </div>
        </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
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
                    <input
                      type="text"
                      required
                      disabled={!!editingProduct}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
                      placeholder="请输入产品代码"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">产品名称</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="请输入产品名称"
                    />
                  </div>
                </div>

                {/* 第二行：产品描述（全宽） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={4}
                    placeholder="请输入产品描述"
                  />
                </div>

                {/* 第三行：激活状态 */}
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

                {/* 按钮区域 */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProduct(null)
                      setFormData({ code: '', name: '', description: '', is_active: true })
                    }}
                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {editingProduct ? '更新' : '创建'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除产品确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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