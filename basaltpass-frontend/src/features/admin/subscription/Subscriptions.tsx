import React, { useState, useEffect, useMemo } from 'react'
import { adminListSubscriptions, adminCancelSubscription, adminGetSubscription } from '@api/subscription/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse } from '@api/admin/tenant'
import useDebounce from '@hooks/useDebounce'
import UserTooltip from '@ui/UserTooltip'
import { ROUTES } from '@constants'
import { useI18n } from '@i18n/useI18n'

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
  // tenant ID
  TenantID?: number
}

export default function AdminSubscriptions() {
  const { t, locale } = useI18n()
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
  // tenant filter
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  const tenantMap = useMemo(() => {
    const m = new Map<number, AdminTenantResponse>()
    tenants.forEach(t => m.set(t.id, t))
    return m
  }, [tenants])

  const renderTenantInfo = (tenantId?: number) => {
    if (!tenantId) return <span className="text-gray-400">{t('adminSubscriptionSubscriptions.tenant.systemLevel')}</span>
    const tenant = tenantMap.get(tenantId)
    if (!tenant) return <span className="text-gray-400">{t('adminSubscriptionSubscriptions.tenant.tenantId', { id: tenantId })}</span>
    return (
      <span>
        {t('adminSubscriptionSubscriptions.tenant.summary', {
          name: tenant.name,
          code: tenant.code,
          plan: tenant.plan,
          status: tenant.status,
        })}
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
      console.error(t('adminSubscriptionSubscriptions.logs.fetchTenantsFailed'), e)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const params: any = {}
      if (selectedTenantId) params.tenant_id = parseInt(selectedTenantId)
      const res = await adminListSubscriptions(params)
      
      
      let list: Subscription[] = []
      if (res.data && res.data.data && Array.isArray(res.data.data)) {
        list = res.data.data
      } else if (Array.isArray(res.data)) {
        list = res.data
      }
      
      setSubscriptions(list)
    } catch (error) {
      console.error(t('adminSubscriptionSubscriptions.logs.fetchSubscriptionsFailed'), error)
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
      console.error(t('adminSubscriptionSubscriptions.logs.cancelSubscriptionFailed'), error)
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
      
      setSelectedSubscription(res.data)
      setShowDetailModal(true)
      
    } catch (error) {
      console.error(t('adminSubscriptionSubscriptions.logs.fetchSubscriptionDetailFailed'), error)
      
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
      trialing: { text: t('adminSubscriptionSubscriptions.status.trialing'), className: 'bg-yellow-100 text-yellow-800' },
      active: { text: t('adminSubscriptionSubscriptions.status.active'), className: 'bg-green-100 text-green-800' },
      paused: { text: t('adminSubscriptionSubscriptions.status.paused'), className: 'bg-gray-100 text-gray-800' },
      canceled: { text: t('adminSubscriptionSubscriptions.status.canceled'), className: 'bg-red-100 text-red-800' },
      overdue: { text: t('adminSubscriptionSubscriptions.status.overdue'), className: 'bg-orange-100 text-orange-800' },
      expired: { text: t('adminSubscriptionSubscriptions.status.expired'), className: 'bg-red-100 text-red-800' }
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
        return t('adminSubscriptionSubscriptions.common.invalidDate')
      }
      return date.toLocaleDateString(locale)
    } catch (error) {
      return t('adminSubscriptionSubscriptions.common.invalidDate')
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
      <AdminLayout title={t('adminSubscriptionSubscriptions.layoutTitle')}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">{t('adminSubscriptionSubscriptions.common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminSubscriptionSubscriptions.layoutTitle')}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">{t('adminSubscriptionSubscriptions.title')}</h1>
          <div className="flex space-x-4 items-center">
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('adminSubscriptionSubscriptions.filters.allTenants')}</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
              ))}
            </select>
            <input
              type="text"
              placeholder={t('adminSubscriptionSubscriptions.filters.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">{t('adminSubscriptionSubscriptions.filters.allStatuses')}</option>
              <option value="trialing">{t('adminSubscriptionSubscriptions.status.trialing')}</option>
              <option value="active">{t('adminSubscriptionSubscriptions.status.active')}</option>
              <option value="paused">{t('adminSubscriptionSubscriptions.status.paused')}</option>
              <option value="canceled">{t('adminSubscriptionSubscriptions.status.canceled')}</option>
              <option value="overdue">{t('adminSubscriptionSubscriptions.status.overdue')}</option>
              <option value="expired">{t('adminSubscriptionSubscriptions.status.expired')}</option>
            </select>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {t('adminSubscriptionSubscriptions.meta.count', { count: filteredSubscriptions.length })}
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
                              {t('adminSubscriptionSubscriptions.meta.subscriptionId', { id: subscription.ID })}
                            </p>
                            {getStatusBadge(subscription.Status)}
                          </div>
                          <p className="mt-1 text-sm text-gray-900">
                            {t('adminSubscriptionSubscriptions.meta.userLabel')}
                            <span className="ml-2">
                              <UserTooltip
                                userId={subscription.UserID}
                                triggerLabel={subscription.User?.Nickname || subscription.User?.Email || `UID ${subscription.UserID}`}
                                fallbackLabel={`UID ${subscription.UserID}`}
                                className="cursor-default border-b border-dotted border-gray-300 text-gray-900"
                              />
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {subscription.CurrentPrice?.Plan?.Product?.Name || t('adminSubscriptionSubscriptions.common.unknownProduct')} - 
                            {subscription.CurrentPrice?.Plan?.DisplayName || t('adminSubscriptionSubscriptions.common.unknownPlan')}
                            {subscription.CurrentPrice && (
                              <span className="ml-2">
                                {formatPrice(subscription.CurrentPrice.AmountCents, subscription.CurrentPrice.Currency)}
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {t('adminSubscriptionSubscriptions.meta.periodEnd', { date: formatDate(subscription.CurrentPeriodEnd) })}
                          </p>
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
                        {t('adminSubscriptionSubscriptions.actions.detail')}
                      </button>
                      {(subscription.Status === 'trialing' || subscription.Status === 'active') && (
                        <button
                          onClick={() => handleCancelClick(subscription)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          {t('adminSubscriptionSubscriptions.actions.cancel')}
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
                {t('adminSubscriptionSubscriptions.empty.noData')}
              </li>
            )}
          </ul>
        </div>

      {showDetailModal && selectedSubscription && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {t('adminSubscriptionSubscriptions.modal.detailTitle', { id: selectedSubscription.ID })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.subscriptionStatus')}</label>
                  <div>
                    {getStatusBadge(selectedSubscription.Status)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.userId')}</label>
                  <p className="text-sm text-gray-900">
                    <UserTooltip
                      userId={selectedSubscription.UserID}
                      triggerLabel={selectedSubscription.User?.Nickname || selectedSubscription.User?.Email || `UID ${selectedSubscription.UserID}`}
                      fallbackLabel={`UID ${selectedSubscription.UserID}`}
                      className="cursor-default border-b border-dotted border-gray-300 text-gray-900"
                    />
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.productInfo')}</label>
                  <p className="text-sm text-gray-900">
                    {selectedSubscription.CurrentPrice?.Plan?.Product?.Name || t('adminSubscriptionSubscriptions.common.unknownProduct')} - 
                    {selectedSubscription.CurrentPrice?.Plan?.DisplayName || t('adminSubscriptionSubscriptions.common.unknownPlan')}
                  </p>
                </div>
                {selectedSubscription.CurrentPrice && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.price')}</label>
                    <p className="text-sm text-gray-900">
                      {formatPrice(selectedSubscription.CurrentPrice.AmountCents, selectedSubscription.CurrentPrice.Currency)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.tenant')}</label>
                  <p className="text-sm text-gray-900">
                    {renderTenantInfo(selectedSubscription.TenantID as unknown as number)}
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.currentPeriodEnd')}</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedSubscription.CurrentPeriodEnd)}
                  </p>
                </div>
                {selectedSubscription.CreatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.createdAt')}</label>
                    <p className="text-sm text-gray-900">
                      {formatDate(selectedSubscription.CreatedAt)}
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.subscriptionId')}</label>
                  <p className="text-sm text-gray-900">
                    #{selectedSubscription.ID}
                  </p>
                </div>
                {selectedSubscription.User?.Nickname && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionSubscriptions.fields.userNickname')}</label>
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
                  {t('adminSubscriptionSubscriptions.actions.cancelSubscription')}
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {t('adminSubscriptionSubscriptions.actions.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {t('adminSubscriptionSubscriptions.cancelModal.title')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('adminSubscriptionSubscriptions.cancelModal.confirmText')}
                </p>
                <div className="mt-3 p-3 bg-gray-50 rounded-md">
                  <p className="text-sm font-medium text-gray-900">
                    {t('adminSubscriptionSubscriptions.meta.subscriptionId', { id: cancelTarget.ID })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionSubscriptions.meta.userLabel')}
                    <span className="ml-1">
                      <UserTooltip
                        userId={cancelTarget.UserID}
                        triggerLabel={cancelTarget.User?.Nickname || cancelTarget.User?.Email || `UID ${cancelTarget.UserID}`}
                        fallbackLabel={`UID ${cancelTarget.UserID}`}
                      />
                    </span>
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {cancelTarget.CurrentPrice?.Plan?.Product?.Name || t('adminSubscriptionSubscriptions.common.unknownProduct')} - 
                    {cancelTarget.CurrentPrice?.Plan?.DisplayName || t('adminSubscriptionSubscriptions.common.unknownPlan')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionSubscriptions.cancelModal.currentStatus', {
                      status:
                        cancelTarget.Status === 'trialing'
                          ? t('adminSubscriptionSubscriptions.status.trialing')
                          : t('adminSubscriptionSubscriptions.status.active'),
                    })}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {t('adminSubscriptionSubscriptions.cancelModal.warning')}
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={handleCancelCancel}
                  disabled={canceling}
                  className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
                >
                  {t('adminSubscriptionSubscriptions.actions.cancel')}
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={canceling}
                  className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {canceling ? t('adminSubscriptionSubscriptions.actions.processing') : t('adminSubscriptionSubscriptions.actions.confirmCancel')}
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
