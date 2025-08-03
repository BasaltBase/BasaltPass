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
  TenantPlan,
  TenantProduct,
  CreateTenantPlanRequest,
  UpdateTenantPlanRequest,
} from '@api/tenant/subscription'

export default function TenantPlans() {
  const [searchParams] = useSearchParams()
  const [plans, setPlans] = useState<TenantPlan[]>([])
  const [products, setProducts] = useState<TenantProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<TenantPlan | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantPlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<CreateTenantPlanRequest>({
    product_id: 0,
    code: '',
    display_name: '',
    plan_version: 1,
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
      const [plansRes, productsRes] = await Promise.all([
        tenantSubscriptionAPI.adminListPlans(),
        tenantSubscriptionAPI.adminListProducts()
      ])
      setPlans(plansRes.data || [])
      setProducts(productsRes.data || [])
    } catch (error) {
      console.error('获取套餐列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPlan) {
        await tenantSubscriptionAPI.updatePlan(editingPlan.ID, formData as UpdateTenantPlanRequest)
      } else {
        await tenantSubscriptionAPI.createPlan(formData)
      }
      setShowModal(false)
      setEditingPlan(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const handleEdit = (plan: TenantPlan) => {
    setEditingPlan(plan)
    setFormData({
      product_id: plan.ProductID,
      code: plan.Code,
      display_name: plan.DisplayName,
      plan_version: plan.PlanVersion,
      metadata: plan.Metadata || {},
    })
    setShowModal(true)
  }

  const handleDeleteClick = (plan: TenantPlan) => {
    setDeleteTarget(plan)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await tenantSubscriptionAPI.deletePlan(deleteTarget.ID)
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
      product_id: 0,
      code: '',
      display_name: '',
      plan_version: 1,
      metadata: {},
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingPlan(null)
    resetForm()
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId)
    return product ? product.Name : `产品 ${productId}`
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
                    <span className="text-gray-900">套餐管理</span>
                  </li>
                </ol>
              </nav>
              <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                套餐管理
              </h2>
            </div>
            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                创建套餐
              </button>
            </div>
          </div>

          {/* 套餐列表 */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {plans.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    暂无套餐数据
                  </li>
                ) : (
                  plans.map((plan) => (
                    <li key={plan.ID} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <p className="text-lg font-medium text-gray-900">
                                {plan.DisplayName}
                              </p>
                              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                <span>代码: {plan.Code}</span>
                                <span>产品: {getProductName(plan.ProductID)}</span>
                                <span>版本: v{plan.PlanVersion}</span>
                                <span>定价数量: {plan.Prices?.length || 0}</span>
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                创建时间: {new Date(plan.CreatedAt).toLocaleString('zh-CN')}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(plan)}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="编辑"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(plan)}
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

      {/* 创建/编辑套餐模态框 */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {editingPlan ? '编辑套餐' : '创建套餐'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">产品</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({...formData, product_id: parseInt(e.target.value)})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={!!editingPlan}
                >
                  <option value="">请选择产品</option>
                  {products.map((product) => (
                    <option key={product.ID} value={product.ID}>
                      {product.Name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">套餐代码</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={!!editingPlan}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">套餐名称</label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">套餐版本</label>
                <input
                  type="number"
                  value={formData.plan_version}
                  onChange={(e) => setFormData({...formData, plan_version: parseInt(e.target.value)})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                  required
                  disabled={!!editingPlan}
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
                  {editingPlan ? '更新' : '创建'}
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
              确定要删除套餐 "{deleteTarget.DisplayName}" 吗？此操作无法撤销。
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
