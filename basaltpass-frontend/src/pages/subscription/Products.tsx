import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listProducts } from '../../api/subscription'
import { Product } from '../../types/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { CubeIcon, WalletIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await listProducts()
      const raw = res.data
      let list: any = []
      if (Array.isArray(raw)) list = raw
      else if (Array.isArray(raw.data)) list = raw.data
      else if (Array.isArray(raw.data?.Data)) list = raw.data.Data
      setProducts(list)
    } catch (error) {
      console.error('获取产品列表失败:', error)
    } finally {
      setLoading(false)
    }
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
                <span className="ml-4 text-sm font-medium text-gray-500">产品与套餐</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">产品与套餐</h1>
            <p className="mt-1 text-sm text-gray-500">
              浏览可用的产品和套餐，选择适合您需求的订阅方案
            </p>
          </div>
          <Link
            to="/subscriptions"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <CreditCardIcon className="h-4 w-4 mr-2" />
            我的订阅
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {products && products.length > 0 ? (
            products.map((product) => (
              <div key={product.ID} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CubeIcon className="h-8 w-8 text-indigo-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{product.Name}</h3>
                      <p className="text-sm text-gray-500">代码: {product.Code}</p>
                    </div>
                  </div>
                  {product.Description && (
                    <p className="mt-3 text-sm text-gray-600">{product.Description}</p>
                  )}
                  
                  {product.Plans && product.Plans.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">可用套餐:</h4>
                      <div className="space-y-2">
                        {product.Plans.map((plan) => (
                          <div key={plan.ID} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{plan.DisplayName}</p>
                              <p className="text-xs text-gray-500">版本 v{plan.PlanVersion}</p>
                            </div>
                            <button className="text-sm text-indigo-600 hover:text-indigo-900 font-medium">
                              订阅
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无产品</h3>
              <p className="mt-1 text-sm text-gray-500">当前没有可用的产品。</p>
            </div>
          )}
        </div>

        {/* 相关链接 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">相关链接</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/subscriptions"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <CreditCardIcon className="h-5 w-5 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">我的订阅</p>
                <p className="text-xs text-gray-500">查看和管理您的订阅</p>
              </div>
            </Link>
            <Link
              to="/wallet"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <WalletIcon className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">钱包</p>
                <p className="text-xs text-gray-500">管理您的账户余额</p>
              </div>
            </Link>
            <Link
              to="/help"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">帮助中心</p>
                <p className="text-xs text-gray-500">获取订阅相关帮助</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
} 