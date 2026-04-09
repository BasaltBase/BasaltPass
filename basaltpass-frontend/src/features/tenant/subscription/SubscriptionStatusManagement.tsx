import React, { useEffect, useMemo, useState } from 'react'
import { uiAlert, uiConfirm } from '@contexts/DialogContext'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import * as tenantSubscriptionAPI from '@api/tenant/subscription'
import { useI18n } from '@shared/i18n'
import { PSkeleton, PBadge, PButton, PPageHeader, Modal } from '@ui'

interface SubscriptionWithDetails {
  ID: number
  TenantID?: number
  UserID: number
  Status: string
  CurrentPriceID: number
  NextPriceID?: number | null
  StartAt: string
  CurrentPeriodStart: string
  CurrentPeriodEnd: string
  CancelAt?: string | null
  CanceledAt?: string | null
  GatewaySubscriptionID?: string | null
  Metadata: Record<string, any>
  CreatedAt: string
  UpdatedAt: string
  User?: {
    ID: number
    Email: string
    Nickname: string
    Phone?: string
    EmailVerified?: boolean
    PhoneVerified?: boolean
  }
  CurrentPrice?: tenantSubscriptionAPI.TenantPrice & {
    Plan?: tenantSubscriptionAPI.TenantPlan & {
      Product?: tenantSubscriptionAPI.TenantProduct
    }
  }
}

function getStatusVariant(status: string) {
  switch (status) {
    case 'active':
      return 'success'
    case 'canceled':
      return 'error'
    case 'paused':
      return 'warning'
    case 'pending':
      return 'info'
    case 'overdue':
      return 'orange'
    case 'trialing':
      return 'info'
    default:
      return 'default'
  }
}

const SubscriptionStatusManagement: React.FC = () => {
  const { t, locale } = useI18n()
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
  }, [statusFilter])

  const getStatusText = (status: string) => {
    const key = `tenantSubscriptionStatusManagement.status.${status}`
    const value = t(key)
    return value === key ? status : value
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'canceled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'paused':
        return <PauseCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-blue-500" />
      case 'overdue':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      case 'trialing':
        return <ClockIcon className="h-5 w-5 text-indigo-500" />
      default:
        return <CreditCardIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const response = await tenantSubscriptionAPI.tenantSubscriptionAPI.listTenantSubscriptions({
        page: 1,
        page_size: 100,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setSubscriptions(response.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionStatusManagement.logs.fetchFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (subscriptionId: number, newStatus: string) => {
    const subscription = subscriptions.find((item) => item.ID === subscriptionId)
    if (!subscription) return

    const confirmMessage = t('tenantSubscriptionStatusManagement.confirm.changeStatus', {
      status: getStatusText(newStatus),
    })
    if (!(await uiConfirm(confirmMessage))) return

    try {
      if (newStatus === 'canceled') {
        await tenantSubscriptionAPI.tenantSubscriptionAPI.cancelSubscription(subscriptionId, {})
      } else {
        console.log(t('tenantSubscriptionStatusManagement.logs.changeStatusTo'), newStatus)
      }

      uiAlert(t('tenantSubscriptionStatusManagement.alerts.updateSuccess'))
      fetchSubscriptions()
    } catch (error: any) {
      console.error(t('tenantSubscriptionStatusManagement.logs.updateFailed'), error)
      uiAlert(
        t('tenantSubscriptionStatusManagement.alerts.updateFailed', {
          error: error?.response?.data?.error || error?.message || '-',
        }),
      )
    }
  }

  const handleViewDetails = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription)
    setShowDetailModal(true)
  }

  const formatCurrency = (cents: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString(locale)
  }

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleString(locale)
  }

  const getBillingPeriodText = (period?: string) => {
    if (period === 'month') return t('tenantSubscriptionStatusManagement.period.month')
    if (period === 'year') return t('tenantSubscriptionStatusManagement.period.year')
    return period || ''
  }

  const getUsageTypeText = (usageType?: string) => {
    if (usageType === 'license') return t('tenantSubscriptionStatusManagement.usageType.license')
    if (!usageType) return t('tenantSubscriptionStatusManagement.common.na')
    return usageType
  }

  const statusCounts = useMemo(
    () =>
      subscriptions.reduce((acc, sub) => {
        acc[sub.Status] = (acc[sub.Status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
    [subscriptions],
  )

  const statCards = [
    { key: 'active', color: 'text-green-600' },
    { key: 'pending', color: 'text-blue-600' },
    { key: 'canceled', color: 'text-red-600' },
    { key: 'overdue', color: 'text-orange-600' },
    { key: 'trialing', color: 'text-indigo-600' },
    { key: 'paused', color: 'text-yellow-600' },
  ]

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionStatusManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantSubscriptionStatusManagement.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantSubscriptionStatusManagement.header.title')}
          description={t('tenantSubscriptionStatusManagement.header.description')}
          icon={<CreditCardIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={fetchSubscriptions} leftIcon={<ArrowPathIcon className="h-4 w-4" />}>
              {t('tenantSubscriptionStatusManagement.actions.refresh')}
            </PButton>
          }
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {statCards.map(({ key, color }) => (
            <div key={key} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">{getStatusIcon(key)}</div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${color} truncate`}>{getStatusText(key)}</dt>
                      <dd className="text-lg font-medium text-gray-900">{statusCounts[key] || 0}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('tenantSubscriptionStatusManagement.stats.monthlyRevenue')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(
                        subscriptions
                          .filter((item) => item.Status === 'active' && item.CurrentPrice?.BillingPeriod === 'month')
                          .reduce((sum, item) => sum + (item.CurrentPrice?.AmountCents || 0), 0),
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('tenantSubscriptionStatusManagement.stats.yearlyRevenue')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(
                        subscriptions
                          .filter((item) => item.Status === 'active' && item.CurrentPrice?.BillingPeriod === 'year')
                          .reduce((sum, item) => sum + (item.CurrentPrice?.AmountCents || 0), 0),
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {t('tenantSubscriptionStatusManagement.stats.totalCustomers')}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(subscriptions.map((item) => item.UserID)).size}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusFilter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {t('tenantSubscriptionStatusManagement.filters.all', { count: subscriptions.length })}
            </button>
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusFilter === status
                    ? getStatusVariant(status) === 'success'
                      ? 'bg-green-100 text-green-800'
                      : getStatusVariant(status) === 'error'
                        ? 'bg-red-100 text-red-800'
                        : getStatusVariant(status) === 'warning'
                          ? 'bg-yellow-100 text-yellow-800'
                          : getStatusVariant(status) === 'info'
                            ? 'bg-blue-100 text-blue-800'
                            : getStatusVariant(status) === 'orange'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {getStatusText(status)} ({count})
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <li key={subscription.ID}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">{getStatusIcon(subscription.Status)}</div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {subscription.CurrentPrice?.Plan?.Product?.Name || t('tenantSubscriptionStatusManagement.common.unknownProduct')} -{' '}
                              {subscription.CurrentPrice?.Plan?.DisplayName || t('tenantSubscriptionStatusManagement.common.unknownPlan')}
                            </p>
                            <PBadge variant={getStatusVariant(subscription.Status) as any} className="ml-2">
                              {getStatusText(subscription.Status)}
                            </PBadge>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">
                              {subscription.CurrentPrice
                                ? formatCurrency(subscription.CurrentPrice.AmountCents, subscription.CurrentPrice.Currency)
                                : t('tenantSubscriptionStatusManagement.common.na')}
                            </p>
                            <p className="text-xs text-gray-500">
                              /{subscription.CurrentPrice?.BillingInterval || 1}
                              {getBillingPeriodText(subscription.CurrentPrice?.BillingPeriod)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.customer')}:</span>{' '}
                              {subscription.User?.Nickname || t('tenantSubscriptionStatusManagement.common.na')} ({subscription.User?.Email || t('tenantSubscriptionStatusManagement.common.na')})
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.userId')}:</span> {subscription.User?.ID}{' '}
                              | <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.subscriptionId')}:</span> {subscription.ID}
                            </p>
                            {subscription.User?.Phone && (
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.phone')}:</span> {subscription.User.Phone}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.startAt')}:</span> {formatDate(subscription.StartAt)}
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.currentPeriod')}:</span>{' '}
                              {formatDate(subscription.CurrentPeriodStart)} - {formatDate(subscription.CurrentPeriodEnd)}
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">{t('tenantSubscriptionStatusManagement.fields.usageType')}:</span>{' '}
                              {getUsageTypeText(subscription.CurrentPrice?.UsageType)}
                            </p>
                          </div>
                        </div>
                        {subscription.Metadata && Object.keys(subscription.Metadata).length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(subscription.Metadata).map(([key, value]) => (
                                <PBadge key={key} variant="info">
                                  {key}: {String(value)}
                                </PBadge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(subscription)}
                        className="inline-flex items-center rounded-full bg-gray-600 p-1 text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        title={t('tenantSubscriptionStatusManagement.actions.viewDetails')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>

                      {subscription.Status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(subscription.ID, 'canceled')}
                          className="inline-flex items-center rounded-full bg-red-600 p-1 text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          title={t('tenantSubscriptionStatusManagement.actions.cancelSubscription')}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('tenantSubscriptionStatusManagement.empty.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('tenantSubscriptionStatusManagement.empty.description')}</p>
          </div>
        )}
      </div>

      {showDetailModal && selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          locale={locale}
          t={t}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          formatDateTime={formatDateTime}
          getStatusIcon={getStatusIcon}
          getStatusText={getStatusText}
          getBillingPeriodText={getBillingPeriodText}
          getUsageTypeText={getUsageTypeText}
          onClose={() => setShowDetailModal(false)}
          onStatusChange={(newStatus) => {
            handleStatusChange(selectedSubscription.ID, newStatus)
            setShowDetailModal(false)
          }}
        />
      )}
    </TenantLayout>
  )
}

const SubscriptionDetailModal: React.FC<{
  subscription: SubscriptionWithDetails
  locale: string
  t: (key: string, params?: Record<string, any>) => string
  formatCurrency: (cents: number, currency?: string) => string
  formatDate: (value?: string | null) => string
  formatDateTime: (value?: string | null) => string
  getStatusIcon: (status: string) => React.ReactNode
  getStatusText: (status: string) => string
  getBillingPeriodText: (period?: string) => string
  getUsageTypeText: (usageType?: string) => string
  onClose: () => void
  onStatusChange: (newStatus: string) => void
}> = ({
  subscription,
  t,
  formatCurrency,
  formatDate,
  formatDateTime,
  getStatusIcon,
  getStatusText,
  getBillingPeriodText,
  getUsageTypeText,
  onClose,
  onStatusChange,
}) => {
  return (
    <Modal open onClose={onClose} title={t('tenantSubscriptionStatusManagement.modal.title', { id: subscription.ID })} widthClass="max-w-3xl">
      <div className="space-y-6">
        <div className="rounded-xl bg-gray-50 p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-3">{t('tenantSubscriptionStatusManagement.modal.sections.basic')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.status')}</label>
              <div className="mt-1 flex items-center">
                {getStatusIcon(subscription.Status)}
                <span className="ml-2 text-sm text-gray-900">{getStatusText(subscription.Status)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.subscriptionId')}</label>
              <p className="mt-1 text-sm text-gray-900">#{subscription.ID}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.startAt')}</label>
              <p className="mt-1 text-sm text-gray-900">{formatDateTime(subscription.StartAt)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.currentPeriod')}</label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(subscription.CurrentPeriodStart)} - {formatDate(subscription.CurrentPeriodEnd)}
              </p>
            </div>

            {subscription.CancelAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.cancelAt')}</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(subscription.CancelAt)}</p>
              </div>
            )}

            {subscription.CanceledAt && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.canceledAt')}</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(subscription.CanceledAt)}</p>
              </div>
            )}
          </div>
        </div>

        {subscription.CurrentPrice && (
          <div className="rounded-xl bg-blue-50 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">{t('tenantSubscriptionStatusManagement.modal.sections.pricing')}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.product')}</label>
                <p className="mt-1 text-sm text-gray-900">{subscription.CurrentPrice.Plan?.Product?.Name || t('tenantSubscriptionStatusManagement.common.na')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.plan')}</label>
                <p className="mt-1 text-sm text-gray-900">{subscription.CurrentPrice.Plan?.DisplayName || t('tenantSubscriptionStatusManagement.common.na')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.price')}</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {formatCurrency(subscription.CurrentPrice.AmountCents, subscription.CurrentPrice.Currency)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.billingPeriod')}</label>
                <p className="mt-1 text-sm text-gray-900">
                  {t('tenantSubscriptionStatusManagement.period.every', {
                    interval: subscription.CurrentPrice.BillingInterval || 1,
                    period: getBillingPeriodText(subscription.CurrentPrice.BillingPeriod),
                  })}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.usageType')}</label>
                <p className="mt-1 text-sm text-gray-900">{getUsageTypeText(subscription.CurrentPrice.UsageType)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.currency')}</label>
                <p className="mt-1 text-sm text-gray-900">{subscription.CurrentPrice.Currency}</p>
              </div>

              {subscription.CurrentPrice.TrialDays && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.trialDays')}</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {t('tenantSubscriptionStatusManagement.fields.trialDaysValue', { days: subscription.CurrentPrice.TrialDays })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {subscription.User && (
          <div className="rounded-xl bg-green-50 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">{t('tenantSubscriptionStatusManagement.modal.sections.customer')}</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.userId')}</label>
                <p className="mt-1 text-sm text-gray-900">#{subscription.User.ID}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.nickname')}</label>
                <p className="mt-1 text-sm text-gray-900">{subscription.User.Nickname || t('tenantSubscriptionStatusManagement.common.na')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.email')}</label>
                <p className="mt-1 text-sm text-gray-900">
                  {subscription.User.Email}
                  {subscription.User.EmailVerified && (
                    <PBadge variant="success" className="ml-2">
                      {t('tenantSubscriptionStatusManagement.common.verified')}
                    </PBadge>
                  )}
                </p>
              </div>

              {subscription.User.Phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.phone')}</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.User.Phone}
                    {subscription.User.PhoneVerified && (
                      <PBadge variant="success" className="ml-2">
                        {t('tenantSubscriptionStatusManagement.common.verified')}
                      </PBadge>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-gray-50 p-4">
          <h4 className="text-lg font-medium text-gray-900 mb-3">{t('tenantSubscriptionStatusManagement.modal.sections.system')}</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.createdAt')}</label>
              <p className="mt-1 text-sm text-gray-900">{formatDateTime(subscription.CreatedAt)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.updatedAt')}</label>
              <p className="mt-1 text-sm text-gray-900">{formatDateTime(subscription.UpdatedAt)}</p>
            </div>

            {subscription.GatewaySubscriptionID && (
              <div>
                <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.gatewaySubscriptionId')}</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{subscription.GatewaySubscriptionID}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">{t('tenantSubscriptionStatusManagement.fields.tenantId')}</label>
              <p className="mt-1 text-sm text-gray-900">#{subscription.TenantID}</p>
            </div>
          </div>
        </div>

        {subscription.Metadata && Object.keys(subscription.Metadata).length > 0 && (
          <div className="rounded-xl bg-yellow-50 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">{t('tenantSubscriptionStatusManagement.modal.sections.metadata')}</h4>
            <div className="space-y-2">
              {Object.entries(subscription.Metadata).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border bg-white p-2">
                  <span className="text-sm font-medium text-gray-700">{key}:</span>
                  <span className="text-sm text-gray-900 font-mono">{JSON.stringify(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 border-t pt-6">
        {subscription.Status === 'active' && (
          <PButton onClick={() => onStatusChange('canceled')} variant="danger">
            {t('tenantSubscriptionStatusManagement.actions.cancelSubscription')}
          </PButton>
        )}
        <PButton onClick={onClose} variant="secondary">
          {t('tenantSubscriptionStatusManagement.actions.close')}
        </PButton>
      </div>
    </Modal>
  )
}

export default SubscriptionStatusManagement
