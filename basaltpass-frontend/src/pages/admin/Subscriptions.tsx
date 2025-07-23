import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { adminListSubscriptions, adminCancelSubscription, adminGetSubscription } from '../../api/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon } from '@heroicons/react/24/outline'

interface Subscription {
  ID: number
  CustomerID: number
  Status: string
  CurrentPeriodEnd: string
  CreatedAt: string
  CurrentPrice?: {
    ID: number
    AmountCents: number
    Currency: string
    Plan?: {
      DisplayName: string
      Product?: {
        Name: string
      }
    }
  }
  Customer?: {
    ID: number
    Email: string
    Nickname: string
  }
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

  // 调试模态框状态
  useEffect(() => {
    console.log('模态框状态变化 - showDetailModal:', showDetailModal, 'selectedSubscription:', selectedSubscription)
  }, [showDetailModal, selectedSubscription])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await adminListSubscriptions()
      console.log('API Response:', res)
      
      // 根据实际API响应结构调整数据提取
      let list: Subscription[] = []
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        list = res.data.data
      } else if (Array.isArray(res.data)) {
        list = res.data
      }
      
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
    console.log('点击详情按钮，订阅ID:', subscription.ID)
    try {
      console.log('开始获取订阅详情...')
      const res = await adminGetSubscription(subscription.ID)
      console.log('获取订阅详情成功:', res)
      console.log('详情数据:', res.data)
      // 修复：API返回格式是 {data: subscription}，所以直接使用 res.data
      setSelectedSubscription(res.data)
      setShowDetailModal(true)
      console.log('模态框状态已设置为显示')
    } catch (error) {
      console.error('获取订阅详情失败:', error)
      // 如果获取详情失败，就用列表中的数据
      console.log('使用列表中的数据作为详情')
      setSelectedSubscription(subscription)
      setShowDetailModal(true)
      console.log('模态框状态已设置为显示（使用列表数据）')
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return '无效日期'
      }
      return date.toLocaleDateString('zh-CN')
    } catch (error) {
      return '无效日期'
    }
  }

  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch = searchTerm === '' || 
      sub.ID.toString().includes(searchTerm) ||
      sub.CustomerID.toString().includes(searchTerm) ||
      sub.CurrentPrice?.Plan?.DisplayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.CurrentPrice?.Plan?.Product?.Name?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || sub.Status === statusFilter
    
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
                <span className="ml-4 text-sm font-medium text-gray-500">订阅管理</span>
              </div>
            </li>
          </ol>
        </nav>

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
                <li key={subscription.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-indigo-600">
                              订阅 #{subscription.ID}
                            </p>
                            {getStatusBadge(subscription.Status)}
                          </div>
                          <p className="mt-1 text-sm text-gray-900">
                            用户ID: {subscription.CustomerID}
                            {subscription.Customer?.Email && (
                              <span className="ml-2 text-gray-500">
                                ({subscription.Customer.Email})
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {subscription.CurrentPrice?.Plan?.Product?.Name || '未知产品'} - 
                            {subscription.CurrentPrice?.Plan?.DisplayName || '未知套餐'}
                            {subscription.CurrentPrice && (
                              <span className="ml-2">
                                {formatPrice(subscription.CurrentPrice.AmountCents, subscription.CurrentPrice.Currency)}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            周期结束: {formatDate(subscription.CurrentPeriodEnd)}
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
                      {(subscription.Status === 'trialing' || subscription.Status === 'active') && (
                        <button
                          onClick={() => handleCancel(subscription.ID)}
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
      </div>

      {/* 详情模态框 */}
      {showDetailModal && selectedSubscription && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                订阅详情 #{selectedSubscription.ID}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">订阅状态</label>
                  <div>
                    {getStatusBadge(selectedSubscription.Status)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">用户ID</label>
                  <p className="text-sm text-gray-900">
                    {selectedSubscription.CustomerID}
                    {selectedSubscription.Customer?.Email && (
                      <span className="ml-2 text-gray-500">
                        ({selectedSubscription.Customer.Email})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">产品信息</label>
                  <p className="text-sm text-gray-900">
                    {selectedSubscription.CurrentPrice?.Plan?.Product?.Name || '未知产品'} - 
                    {selectedSubscription.CurrentPrice?.Plan?.DisplayName || '未知套餐'}
                  </p>
                </div>
                {selectedSubscription.CurrentPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">价格</label>
                    <p className="text-sm text-gray-900">
                      {formatPrice(selectedSubscription.CurrentPrice.AmountCents, selectedSubscription.CurrentPrice.Currency)}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">当前周期结束</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedSubscription.CurrentPeriodEnd)}
                  </p>
                </div>
                {selectedSubscription.CreatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedSubscription.CreatedAt)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">订阅ID</label>
                  <p className="text-sm text-gray-900">
                    #{selectedSubscription.ID}
                  </p>
                </div>
                {selectedSubscription.Customer?.Nickname && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">用户昵称</label>
                    <p className="text-sm text-gray-900">
                      {selectedSubscription.Customer.Nickname}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              {(selectedSubscription.Status === 'trialing' || selectedSubscription.Status === 'active') && (
                <button
                  onClick={() => {
                    handleCancel(selectedSubscription.ID)
                    setShowDetailModal(false)
                  }}
                  className="px-6 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  取消订阅
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
} 