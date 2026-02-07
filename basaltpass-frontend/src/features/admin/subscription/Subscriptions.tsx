import React, { useState, useEffect, useMemo } from 'react'
import { adminListSubscriptions, adminCancelSubscription, adminGetSubscription } from '@api/subscription/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import useDebounce from '@hooks/useDebounce'
import { ROUTES } from '@constants'

interface Subscription {
  ID: number
  UserID: number
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
  User?: {
    ID: number
    Email: string
    Nickname: string
  }
  // 新增：租户ID
  TenantID?: number
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
  const [statusFilter, setStatusFilter] = useState('')
  // 新增：租户筛选
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

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

  useEffect(() => {
    fetchTenants()
    fetchSubscriptions()
  }, [])

  useEffect(() => {
    fetchSubscriptions()
  }, [selectedTenantId])

  const fetchTenants = async () => {
    try {
      const res = await adminTenantApi.getTenantList({ page: 1, limit: 1000 })
      setTenants(res.tenants || [])
    } catch (e) {
      console.error('获取租户列表失败:', e)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedTenantId) params.tenant_id = parseInt(selectedTenantId)
      const res = await adminListSubscriptions(params)
      
      
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

  const handleCancelClick = (subscription: Subscription) => {
    setCancelTarget(subscription)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    
    try {
      setCanceling(true)
      await adminCancelSubscription(cancelTarget.ID)
      await fetchSubscriptions()
      setShowCancelModal(false)
      setCancelTarget(null)
    } catch (error) {
      console.error('取消订阅失败:', error)
    } finally {
      setCanceling(false)
    }
  }

  const handleCancelCancel = () => {
    setShowCancelModal(false)
    setCancelTarget(null)
  }

  const handleViewDetail = async (subscription: Subscription) => {
    
    try {
      
      const res = await adminGetSubscription(subscription.ID)
      
      // 修复：API返回格式是 {data: subscription}，所以直接使用 res.data
      setSelectedSubscription(res.data)
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
    const matchesSearch = debouncedSearchTerm === '' || 
      sub.ID.toString().includes(debouncedSearchTerm) ||
      sub.UserID.toString().includes(debouncedSearchTerm) ||
      sub.CurrentPrice?.Plan?.DisplayName?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      sub.CurrentPrice?.Plan?.Product?.Name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || sub.Status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <AdminLayout title="订阅管理">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="订阅管理">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to={ROUTES.admin.dashboard} className="text-gray-400 hover:text-gray-500">
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
          <div className="flex space-x-4 items-center">
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
            {/* 现有搜索与状态过滤 */}
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
                            用户ID: {subscription.UserID}
                            {subscription.User?.Email && (
                              <span className="ml-2 text-gray-500">
                                ({subscription.User.Email})
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
                          {/* 新增：租户信息 */}
                          <p className="mt-1 text-xs text-gray-500">
                            {renderTenantInfo(subscription.TenantID as unknown as number)}
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
                          onClick={() => handleCancelClick(subscription)}
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
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
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
                    {selectedSubscription.UserID}
                    {selectedSubscription.User?.Email && (
                      <span className="ml-2 text-gray-500">
                        ({selectedSubscription.User.Email})
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
                {/* 新增：租户信息 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">租户</label>
                  <p className="text-sm text-gray-900">
                    {renderTenantInfo(selectedSubscription.TenantID as unknown as number)}
                  </p>
                </div>
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
                {selectedSubscription.User?.Nickname && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">用户昵称</label>
                    <p className="text-sm text-gray-900">
                      {selectedSubscription.User.Nickname}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
              {(selectedSubscription.Status === 'trialing' || selectedSubscription.Status === 'active') && (
                <button
                  onClick={() => {
                    handleCancelClick(selectedSubscription)
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

      {/* 取消订阅确认模态框 */}
      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                确认取消订阅
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  您确定要取消以下订阅吗？
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    订阅 #{cancelTarget.ID}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    用户ID: {cancelTarget.UserID}
                    {cancelTarget.User?.Email && (
                      <span className="ml-1">({cancelTarget.User.Email})</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {cancelTarget.CurrentPrice?.Plan?.Product?.Name || '未知产品'} - 
                    {cancelTarget.CurrentPrice?.Plan?.DisplayName || '未知套餐'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    当前状态: {cancelTarget.Status === 'trialing' ? '试用中' : '进行中'}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  取消后，用户将无法继续使用相关服务，直到重新订阅。
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={handleCancelCancel}
                  disabled={canceling}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={canceling}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {canceling ? '处理中...' : '确认取消'}
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