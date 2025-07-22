import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { listSubscriptions, cancelSubscription } from '../../api/subscription'
import { SubscriptionResponse } from '../../types/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, CubeIcon, WalletIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'

export default function SubscriptionIndex() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await listSubscriptions()
      const raw = res.data
      let list: any = []
      if (Array.isArray(raw)) list = raw
      else if (Array.isArray(raw.data)) list = raw.data
      else if (Array.isArray(raw.data?.Data)) list = raw.data.Data
      setSubscriptions(list)
    } catch (error) {
      console.error('获取订阅列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id: number) => {
    if (confirm('确定要取消这个订阅吗？')) {
      try {
        await cancelSubscription(id)
        fetchSubscriptions()
      } catch (error) {
        console.error('取消订阅失败:', error)
      }
    }
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'trialing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            试用中
          </span>
        )
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            进行中
          </span>
        )
      case 'canceled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            已取消
          </span>
        )
      case 'past_due':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            逾期
          </span>
        )
      case 'unpaid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            未付款
          </span>
        )
      default:
        return status
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
                <span className="ml-4 text-sm font-medium text-gray-500">我的订阅</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">我的订阅</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您的所有订阅，查看状态和账单信息
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <CubeIcon className="h-4 w-4 mr-2" />
            浏览产品
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {subscriptions && subscriptions.length > 0 ? (
              subscriptions.map((sub) => (
                <li key={sub.ID} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          订阅 #{sub.ID}
                        </p>
                        {statusBadge(sub.Status)}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        产品: {sub.CurrentPrice?.Plan?.Product?.Name || '未知产品'} - 
                        {sub.CurrentPrice?.Plan?.DisplayName || '未知套餐'}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        周期结束: {new Date(sub.CurrentPeriodEnd).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {(sub.Status === 'trialing' || sub.Status === 'active') && (
                        <button
                          onClick={() => handleCancel(sub.ID)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          取消订阅
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
                暂无订阅记录
              </li>
            )}
          </ul>
        </div>

        {/* 相关链接 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">相关链接</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/products"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <CubeIcon className="h-5 w-5 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">产品与套餐</p>
                <p className="text-xs text-gray-500">浏览可用的产品和服务</p>
              </div>
            </Link>
            <Link
              to="/wallet"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <WalletIcon className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">钱包</p>
                <p className="text-xs text-gray-500">管理您的账户余额和支付</p>
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