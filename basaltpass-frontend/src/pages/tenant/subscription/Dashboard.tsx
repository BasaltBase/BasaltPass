import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ChartBarIcon,
  CubeIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  TicketIcon,
  ChevronRightIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '../../../components/TenantLayout'
import { tenantSubscriptionAPI, TenantSubscriptionStats } from '../../../api/tenantSubscription'

export default function TenantSubscriptionDashboard() {
  const [stats, setStats] = useState<TenantSubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await tenantSubscriptionAPI.getSubscriptionStats()
      setStats(data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amountCents: number) => {
    return tenantSubscriptionAPI.formatPrice(amountCents, 'CNY')
  }

  const managementItems = [
    {
      name: '产品管理',
      description: '管理产品目录和产品信息',
      href: '/tenant/subscription/products',
      icon: CubeIcon,
      color: 'bg-blue-500',
    },
    {
      name: '套餐管理',
      description: '配置产品套餐和功能特性',
      href: '/tenant/subscription/plans',
      icon: ChartBarIcon,
      color: 'bg-green-500',
    },
    {
      name: '定价管理',
      description: '设置套餐价格和计费规则',
      href: '/tenant/subscription/prices',
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
    },
    {
      name: '订阅管理',
      description: '查看和管理客户订阅',
      href: '/tenant/subscription/subscriptions',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
    },
    {
      name: '账单管理',
      description: '查看账单和支付记录',
      href: '/tenant/subscription/invoices',
      icon: DocumentTextIcon,
      color: 'bg-indigo-500',
    },
    {
      name: '优惠券管理',
      description: '创建和管理优惠券',
      href: '/tenant/subscription/coupons',
      icon: TicketIcon,
      color: 'bg-pink-500',
    },
  ]

  if (loading) {
    return (
      <TenantLayout title="订阅系统">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 bg-gray-200 rounded"></div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title="订阅系统">
      <div className="space-y-6">
        {/* 面包屑 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                to="/tenant/dashboard"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                租户控制台
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">订阅系统</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">总订阅数</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_subscriptions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">活跃订阅</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.active_subscriptions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">月收入</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(stats.monthly_revenue_cents)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-8 w-8 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">客户数量</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_customers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 管理功能网格 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">订阅管理</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managementItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                >
                  <div>
                    <span className={`${item.color} rounded-lg inline-flex p-3 ring-4 ring-white`}>
                      <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {item.name}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500">{item.description}</p>
                  </div>
                  <span
                    className="pointer-events-none absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                    aria-hidden="true"
                  >
                    <ChevronRightIcon className="h-6 w-6" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">快速操作</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/tenant/subscription/products?action=create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                创建产品
              </Link>
              <Link
                to="/tenant/subscription/plans?action=create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                创建套餐
              </Link>
              <Link
                to="/tenant/subscription/prices?action=create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                设置价格
              </Link>
              <Link
                to="/tenant/subscription/coupons?action=create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                创建优惠券
              </Link>
            </div>
          </div>
        </div>

        {/* 状态概览 */}
        {stats && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">订阅状态概览</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">活跃订阅</p>
                      <p className="text-2xl font-bold text-green-900">{stats.active_subscriptions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">已取消订阅</p>
                      <p className="text-2xl font-bold text-red-900">{stats.canceled_subscriptions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-yellow-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">暂停订阅</p>
                      <p className="text-2xl font-bold text-yellow-900">{stats.paused_subscriptions}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
