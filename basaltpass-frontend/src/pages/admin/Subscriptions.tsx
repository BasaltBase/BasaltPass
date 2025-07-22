import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { adminListSubscriptions, adminCancelSubscription, getSubscription } from '../../api/subscription'

interface Subscription {
  id: number
  customer_id: number
  status: string
  current_period_end: string
  current_price?: {
    id: number
    amount_cents: number
    currency: string
    plan?: {
      display_name: string
      product?: {
        name: string
      }
    }
  }
  created_at?: string
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await adminListSubscriptions()
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
        await adminCancelSubscription(id)
        fetchSubscriptions()
      } catch (error) {
        console.error('取消订阅失败:', error)
      }
    }
  }

  const handleViewDetail = async (subscription: Subscription) => {
    try {
      const res = await getSubscription(subscription.id)
      setSelectedSubscription(res.data.data)
      setShowDetailModal(true)
    } catch (error) {
      console.error('获取订阅详情失败:', error)
      // 如果获取详情失败，就用列表中的数据
      setSelectedSubscription(subscription)
      setShowDetailModal(true)
    }
  }

  const formatPrice = (amountCents: number, currency: string) => {
    const amount = amountCents / 100
    return `${amount.toFixed(2)} ${currency}`
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      trialing: { text: '试用中', className: 'bg-yellow-100 text-yellow-800' },
      active: { text: '进行中', className: 'bg-green-100 text-green-800' },
      paused: { text: '已暂停', className: 'bg-gray-100 text-gray-800' },
      canceled: { text: '已取消', className: 'bg-red-100 text-red-800' },
      overdue: { text: '逾期', className: 'bg-orange-100 text-orange-800' },
      expired: { text: '已过期', className: 'bg-red-100 text-red-800' }
    }
    const config = statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.text}
      </span>
    )
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' || 
      sub.id.toString().includes(searchTerm) ||
      sub.customer_id.toString().includes(searchTerm) ||
      sub.current_price?.plan?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.current_price?.plan?.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || sub.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">订阅管理</h1>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="搜索订阅ID、用户ID、产品名称..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">全部状态</option>
              <option value="trialing">试用中</option>
              <option value="active">进行中</option>
              <option value="paused">已暂停</option>
              <option value="canceled">已取消</option>
              <option value="overdue">逾期</option>
              <option value="expired">已过期</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              共 {filteredSubscriptions.length} 条订阅记录
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {filteredSubscriptions && filteredSubscriptions.length > 0 ? (
              filteredSubscriptions.map((subscription) => (
                <li key={subscription.id}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-indigo-600">
                              订阅 #{subscription.id}
                            </p>
                            {getStatusBadge(subscription.status)}
                          </div>
                          <p className="mt-1 text-sm text-gray-900">
                            用户ID: {subscription.customer_id}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {subscription.current_price?.plan?.product?.name} - 
                            {subscription.current_price?.plan?.display_name}
                            {subscription.current_price && (
                              <span className="ml-2">
                                {formatPrice(subscription.current_price.amount_cents, subscription.current_price.currency)}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            周期结束: {new Date(subscription.current_period_end).toLocaleDateString('zh-CN')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetail(subscription)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        详情
                      </button>
                      {(subscription.status === 'trialing' || subscription.status === 'active') && (
                        <button
                          onClick={() => handleCancel(subscription.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          取消
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
                暂无订阅数据
              </li>
            )}
          </ul>
        </div>

        {/* 详情模态框 */}
        {showDetailModal && selectedSubscription && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-2/3 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    订阅详情 #{selectedSubscription.id}
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">订阅状态</label>
                      <div className="mt-1">
                        {getStatusBadge(selectedSubscription.status)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">用户ID</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedSubscription.customer_id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">产品信息</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedSubscription.current_price?.plan?.product?.name} - 
                        {selectedSubscription.current_price?.plan?.display_name}
                      </p>
                    </div>
                    {selectedSubscription.current_price && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">价格</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {formatPrice(selectedSubscription.current_price.amount_cents, selectedSubscription.current_price.currency)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">当前周期结束</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedSubscription.current_period_end).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    {selectedSubscription.created_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">创建时间</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(selectedSubscription.created_at).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 mt-6 border-t">
                  {(selectedSubscription.status === 'trialing' || selectedSubscription.status === 'active') && (
                    <button
                      onClick={() => {
                        handleCancel(selectedSubscription.id)
                        setShowDetailModal(false)
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                    >
                      取消订阅
                    </button>
                  )}
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 