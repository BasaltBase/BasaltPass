import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { adminListPlans, adminCreatePlan, adminUpdatePlan, adminDeletePlan, adminListProducts } from '../../api/subscription'
import { Plan, Product } from '../../types/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState({
    product_id: '',
    code: '',
    display_name: '',
    description: '',
    plan_version: 1,
    is_active: true
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [plansRes, productsRes] = await Promise.all([
        adminListPlans(),
        adminListProducts()
      ])
      
      // 处理套餐数据
      const plansRaw = plansRes.data.Data
      let plansList: any = []
      if (Array.isArray(plansRaw)) plansList = plansRaw
      else if (Array.isArray(plansRaw.data)) plansList = plansRaw.data
      else if (Array.isArray(plansRaw.data?.Data)) plansList = plansRaw.data.Data
      setPlans(plansList)

      // 处理产品数据
      const productsRaw = productsRes.data.Data
      let productsList: any = []
      if (Array.isArray(productsRaw)) productsList = productsRaw
      else if (Array.isArray(productsRaw.data)) productsList = productsRaw.data
      else if (Array.isArray(productsRaw.data?.Data)) productsList = productsRaw.data.Data
      console.log('获取产品列表:', productsList)
      setProducts(productsList)
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

  const handleDelete = async (id: number) => {
    if (confirm('确定要删除这个套餐吗？')) {
      try {
        await adminDeletePlan(id)
        fetchData()
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
  }

  const getProductName = (productId: number) => {
    const product = products.find(p => p.ID === productId)
    return product ? product.Name : '未知产品'
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
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
                <span className="ml-4 text-sm font-medium text-gray-500">套餐管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">套餐管理</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            新建套餐
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {plans && plans.length > 0 ? (
              plans.map((plan) => (
                <li key={plan.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {plan.DisplayName}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            产品: {getProductName(plan.ProductID || 0)} | 版本: v{plan.PlanVersion}
                          </p>
                          {plan.Description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {plan.Description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(plan)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(plan.ID)}
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
                暂无套餐数据
              </li>
            )}
          </ul>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPlan ? '编辑套餐' : '新建套餐'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">所属产品</label>
                    <select
                      required
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">套餐名称</label>
                    <input
                      type="text"
                      required
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">套餐描述</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">版本号</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.plan_version}
                      onChange={(e) => setFormData({ ...formData, plan_version: parseInt(e.target.value) })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
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
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
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
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      {editingPlan ? '更新' : '创建'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 