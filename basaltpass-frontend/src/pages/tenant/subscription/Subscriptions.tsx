import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TenantLayout from '@components/TenantLayout'
import {
  ChevronRightIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  Subscription,
  CancelTenantSubscriptionRequest,
} from '@api/tenant/subscription'

export default function TenantSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (statusFilter) {
        params.status = statusFilter
      }
      const data = await tenantSubscriptionAPI.adminListSubscriptions(params)
      setSubscriptions(data.data || [])
    } catch (error) {
      console.error('获取订阅列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClick = (subscription: Subscription) => {
    setCancelTarget(subscription)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    
    try {
      setCancelling(true)
      const cancelData: CancelTenantSubscriptionRequest = {}
      if (cancelReason) {
        cancelData.reason = cancelReason
      }
      await tenantSubscriptionAPI.cancelSubscription(cancelTarget.ID, cancelData)
      await fetchData()
      setShowCancelModal(false)
      setCancelTarget(null)
      setCancelReason('')
    } catch (error) {
      console.error('取消订阅失败:', error)
    } finally {
      setCancelling(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter(subscription => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      subscription.ID.toString().includes(searchLower) ||
      subscription.UserID.toString().includes(searchLower) ||
      subscription.CurrentPrice?.Plan?.Product?.Name?.toLowerCase().includes(searchLower) ||
      subscription.CurrentPrice?.Plan?.DisplayName?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = tenantSubscriptionAPI.formatSubscriptionStatus(status)
    const colorClasses = {
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
      gray: 'bg-gray-100 text-gray-800',
      orange: 'bg-orange-100 text-orange-800',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[statusInfo.color as keyof typeof colorClasses] || colorClasses.gray}`}>
        {statusInfo.text}
      </span>
    )
  }

  if (loading) {
    return (
      <TenantLayout title="订阅管理">
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
    <TenantLayout title="订阅管理">
      <div className="space-y-6">
        {/* 面包屑 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                to="/tenant/subscriptions"
                className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                订阅系统
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">订阅管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">订阅管理</h1>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="搜索订阅ID、客户ID或产品名称..."
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-2 pl-3 pr-10 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="canceled">已取消</option>
                <option value="paused">已暂停</option>
                <option value="past_due">逾期</option>
                <option value="unpaid">未支付</option>
              </select>
            </div>
            {(searchTerm || statusFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('')
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                清除
              </button>
            )}
          </div>
        </div>

        {/* 订阅列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredSubscriptions.length > 0 ? (
              filteredSubscriptions.map((subscription) => (
                <li key={subscription.ID}>
                  <div className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-blue-600">
                                订阅 #{subscription.ID}
                              </p>
                              {getStatusBadge(subscription.Status)}
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>客户ID: {subscription.UserID}</span>
                              <span>•</span>
                              <span>
                                产品: {subscription.CurrentPrice?.Plan?.Product?.Name} - {subscription.CurrentPrice?.Plan?.DisplayName}
                              </span>
                              <span>•</span>
                              <span>
                                价格: {tenantSubscriptionAPI.formatPrice(subscription.CurrentPrice?.AmountCents || 0, subscription.CurrentPrice?.Currency || 'CNY')}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>开始时间: {formatDate(subscription.StartAt)}</span>
                              <span>•</span>
                              <span>当前周期: {formatDate(subscription.CurrentPeriodStart)} - {formatDate(subscription.CurrentPeriodEnd)}</span>
                              {subscription.CancelAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600">取消时间: {formatDate(subscription.CancelAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {subscription.Status === 'active' && (
                          <button
                            onClick={() => handleCancelClick(subscription)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            取消订阅
                          </button>
                        )}
                        <Link
                          to={`/tenant/subscriptions/detail/${subscription.ID}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          查看详情
                        </Link>
                      </div>
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
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {searchTerm || statusFilter ? '未找到匹配的订阅' : '暂无订阅'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter ? '请尝试修改搜索条件' : '客户的订阅信息将在此处显示'}
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* 取消订阅确认模态框 */}
        {showCancelModal && cancelTarget && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">取消订阅</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    确定要取消订阅 #{cancelTarget.ID} 吗？
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    产品: {cancelTarget.CurrentPrice?.Plan?.Product?.Name} - {cancelTarget.CurrentPrice?.Plan?.DisplayName}
                  </p>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      取消原因 (可选)
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="请输入取消原因..."
                    />
                  </div>
                </div>
                <div className="flex justify-center space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCancelModal(false)
                      setCancelTarget(null)
                      setCancelReason('')
                    }}
                    disabled={cancelling}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCancelConfirm}
                    disabled={cancelling}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {cancelling ? '取消中...' : '确认取消'}
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
