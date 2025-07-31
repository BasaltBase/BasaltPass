import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '../../../components/TenantLayout'
import {
  tenantSubscriptionAPI,
  TenantProduct,
  CreateTenantProductRequest,
  UpdateTenantProductRequest,
} from '../../../api/tenantSubscription'

export default function TenantProducts() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<TenantProduct | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantProduct | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<CreateTenantProductRequest>({
    code: '',
    name: '',
    description: '',
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
      const data = await tenantSubscriptionAPI.listProducts()
      setProducts(data.data || [])
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
        await tenantSubscriptionAPI.updateProduct(editingProduct.ID, formData as UpdateTenantProductRequest)
      } else {
        await tenantSubscriptionAPI.createProduct(formData)
      }
      setShowModal(false)
      setEditingProduct(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleEdit = (product: TenantProduct) => {
    setEditingProduct(product)
    setFormData({
      code: product.Code,
      name: product.Name,
      description: product.Description,
      metadata: product.Metadata || {},
    })
    setShowModal(true)
  }

  const handleDeleteClick = (product: TenantProduct) => {
    setDeleteTarget(product)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await tenantSubscriptionAPI.deleteProduct(deleteTarget.ID)
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
      code: '',
      name: '',
      description: '',
      metadata: {},
    })
  }

  if (loading) {
    return (
      <TenantLayout title="产品管理">
        <div className="animate-pulse">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {[1, 2, 3].map((i) => (
                <li key={i} className="px-4 py-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title="产品管理">
      <div className="space-y-6">
        {/* 面包屑 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                to="/tenant/subscription"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                订阅系统
              </Link>
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
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            创建产品
          </button>
        </div>

        {/* 产品列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {products.length > 0 ? (
              products.map((product) => (
                <li key={product.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {product.Name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            代码: {product.Code} | 
                            套餐数: {product.Plans?.length || 0}
                          </p>
                          {product.Description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {product.Description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-600 hover:text-blue-900"
                        title="编辑产品"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(product)}
                        className="text-red-600 hover:text-red-900"
                        title="删除产品"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-12 text-center text-gray-500">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无产品</h3>
                  <p className="mt-1 text-sm text-gray-500">开始创建您的第一个产品吧</p>
                  <div className="mt-6">
                    <button
                      onClick={() => setShowModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      创建产品
                    </button>
                  </div>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* 创建/编辑产品模态框 */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingProduct ? '编辑产品' : '创建产品'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品代码 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如: basic-plan"
                      disabled={!!editingProduct}
                    />
                    {editingProduct && (
                      <p className="mt-1 text-xs text-gray-500">产品代码创建后不可修改</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品名称 *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例如: 基础版"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      产品描述
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="描述产品的功能和特点"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setEditingProduct(null)
                        resetForm()
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      {editingProduct ? '更新' : '创建'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认模态框 */}
        {showDeleteModal && deleteTarget && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">删除产品</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    确定要删除产品 "{deleteTarget.Name}" 吗？
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    此操作将同时删除相关的套餐和定价，且无法恢复。
                  </p>
                </div>
                <div className="flex justify-center space-x-3 mt-4">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false)
                      setDeleteTarget(null)
                    }}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleting}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? '删除中...' : '确认删除'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
