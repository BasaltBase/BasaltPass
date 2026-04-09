import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  Subscription,
  CancelTenantSubscriptionRequest,
  listTenantUserSubscriptions,
  getTenantUserSubscription,
} from '@api/tenant/subscription'
import { useI18n } from '@shared/i18n'
import { PInput, PSelect, PButton, PTextarea, PBadge, Modal, PPageHeader } from '@ui'
import useDebounce from '@hooks/useDebounce'
import { ROUTES } from '@constants'

export default function TenantSubscriptions() {
  const { t, locale } = useI18n()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
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
      const data = await listTenantUserSubscriptions(params)
      setSubscriptions(data.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionSubscriptions.logs.fetchFailed'), error)
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
      console.error(t('tenantSubscriptionSubscriptions.logs.cancelFailed'), error)
    } finally {
      setCancelling(false)
    }
  }

  const filteredSubscriptions = subscriptions.filter(subscription => {
    if (!debouncedSearchTerm) return true
    const searchLower = debouncedSearchTerm.toLowerCase()
    return (
      subscription.ID.toString().includes(searchLower) ||
      subscription.UserID.toString().includes(searchLower) ||
      subscription.CurrentPrice?.Plan?.Product?.Name?.toLowerCase().includes(searchLower) ||
      subscription.CurrentPrice?.Plan?.DisplayName?.toLowerCase().includes(searchLower)
    )
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale)
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = tenantSubscriptionAPI.formatSubscriptionStatus(status)
    const variantMap: Record<string, string> = {
      green: 'success',
      red: 'error',
      yellow: 'warning',
      blue: 'info',
      gray: 'default',
      orange: 'orange',
    }
    return (
      <PBadge variant={(variantMap[statusInfo.color] || 'default') as any}>{statusInfo.text}</PBadge>
    )
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionSubscriptions.layoutTitle')}>
        <div className="animate-pulse">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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
    <TenantLayout title={t('tenantSubscriptionSubscriptions.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantSubscriptionSubscriptions.header.title')}
          description={t('tenantSubscriptionSubscriptions.header.description')}
        />

        {/*  */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <PInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('tenantSubscriptionSubscriptions.search.placeholder')}
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
              />
            </div>
            <div className="sm:w-48">
              <PSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t('tenantSubscriptionSubscriptions.filters.allStatus')}</option>
                <option value="active">{t('tenantSubscriptionSubscriptions.filters.active')}</option>
                <option value="canceled">{t('tenantSubscriptionSubscriptions.filters.canceled')}</option>
                <option value="paused">{t('tenantSubscriptionSubscriptions.filters.paused')}</option>
                <option value="past_due">{t('tenantSubscriptionSubscriptions.filters.pastDue')}</option>
                <option value="unpaid">{t('tenantSubscriptionSubscriptions.filters.unpaid')}</option>
              </PSelect>
            </div>
            {(searchTerm || statusFilter) && (
              <PButton
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('')
                }}
                variant="secondary"
                size="sm"
              >
                {t('tenantSubscriptionSubscriptions.actions.clear')}
              </PButton>
            )}
          </div>
        </div>

        {/*  */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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
                                {t('tenantSubscriptionSubscriptions.fields.subscriptionId', { id: subscription.ID })}
                              </p>
                              {getStatusBadge(subscription.Status)}
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>{t('tenantSubscriptionSubscriptions.fields.customerId')}: {subscription.UserID}</span>
                              <span>•</span>
                              <span>
                                {t('tenantSubscriptionSubscriptions.fields.product')}: {subscription.CurrentPrice?.Plan?.Product?.Name} - {subscription.CurrentPrice?.Plan?.DisplayName}
                              </span>
                              <span>•</span>
                              <span>
                                {t('tenantSubscriptionSubscriptions.fields.price')}: {tenantSubscriptionAPI.formatPrice(subscription.CurrentPrice?.AmountCents || 0, subscription.CurrentPrice?.Currency || 'CNY')}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                              <span>{t('tenantSubscriptionSubscriptions.fields.startAt')}: {formatDate(subscription.StartAt)}</span>
                              <span>•</span>
                              <span>{t('tenantSubscriptionSubscriptions.fields.currentPeriod')}: {formatDate(subscription.CurrentPeriodStart)} - {formatDate(subscription.CurrentPeriodEnd)}</span>
                              {subscription.CanceledAt && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600">{t('tenantSubscriptionSubscriptions.fields.canceledAt')}: {formatDate(subscription.CanceledAt)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {subscription.Status === 'active' && (
                          <PButton
                            onClick={() => handleCancelClick(subscription)}
                            variant="danger"
                            size="sm"
                          >
                            {t('tenantSubscriptionSubscriptions.actions.cancelSubscription')}
                          </PButton>
                        )}
                        <Link
                          to={`/tenant/subscriptions/detail/${subscription.ID}`}
                          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                        >
                          {t('tenantSubscriptionSubscriptions.actions.viewDetail')}
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
                    {searchTerm || statusFilter ? t('tenantSubscriptionSubscriptions.empty.noMatchTitle') : t('tenantSubscriptionSubscriptions.empty.noDataTitle')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm || statusFilter ? t('tenantSubscriptionSubscriptions.empty.noMatchDescription') : t('tenantSubscriptionSubscriptions.empty.noDataDescription')}
                  </p>
                </div>
              </li>
            )}
          </ul>
        </div>

        {/*  */}
        {showCancelModal && cancelTarget && (
          <Modal
            open={showCancelModal}
            onClose={() => {
              setShowCancelModal(false)
              setCancelTarget(null)
              setCancelReason('')
            }}
            title={t('tenantSubscriptionSubscriptions.modal.title')}
            widthClass="max-w-md"
          >
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {t('tenantSubscriptionSubscriptions.modal.confirmText', { id: cancelTarget.ID })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('tenantSubscriptionSubscriptions.fields.product')}: {cancelTarget.CurrentPrice?.Plan?.Product?.Name} - {cancelTarget.CurrentPrice?.Plan?.DisplayName}
                  </p>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                      {t('tenantSubscriptionSubscriptions.modal.reasonLabel')}
                    </label>
                    <PTextarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      rows={3}
                      placeholder={t('tenantSubscriptionSubscriptions.modal.reasonPlaceholder')}
                    />
                  </div>
                </div>
                <div className="flex justify-center space-x-3 mt-6">
                  <PButton
                    onClick={() => {
                      setShowCancelModal(false)
                      setCancelTarget(null)
                      setCancelReason('')
                    }}
                    disabled={cancelling}
                    variant="secondary"
                  >
                    {t('tenantSubscriptionSubscriptions.actions.cancel')}
                  </PButton>
                  <PButton
                    onClick={handleCancelConfirm}
                    loading={cancelling}
                    variant="danger"
                  >
                    {t('tenantSubscriptionSubscriptions.actions.confirmCancel')}
                  </PButton>
                </div>
              </div>
          </Modal>
        )}
      </div>
    </TenantLayout>
  )
}
