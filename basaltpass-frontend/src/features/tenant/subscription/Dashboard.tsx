import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
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

import {
  tenantSubscriptionAPI,
  TenantSubscriptionStats
} from '@api/tenant/subscription'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function TenantSubscriptionDashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState<TenantSubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await tenantSubscriptionAPI.adminGetSubscriptionStats()
      setStats(data)
    } catch (error) {
      console.error(t('tenantSubscriptionDashboard.logs.loadStatsFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amountCents: number) => {
    return tenantSubscriptionAPI.formatPrice(amountCents, 'CNY')
  }

  const managementItems = [
    {
      name: t('tenantSubscriptionDashboard.management.products.name'),
      description: t('tenantSubscriptionDashboard.management.products.description'),
      href: ROUTES.tenant.subscriptionProducts,
      icon: CubeIcon,
      color: 'bg-blue-500',
    },
    {
      name: t('tenantSubscriptionDashboard.management.plans.name'),
      description: t('tenantSubscriptionDashboard.management.plans.description'),
      href: ROUTES.tenant.plans,
      icon: ChartBarIcon,
      color: 'bg-green-500',
    },
    {
      name: t('tenantSubscriptionDashboard.management.prices.name'),
      description: t('tenantSubscriptionDashboard.management.prices.description'),
      href: ROUTES.tenant.prices,
      icon: CurrencyDollarIcon,
      color: 'bg-yellow-500',
    },
    {
      name: t('tenantSubscriptionDashboard.management.subscriptions.name'),
      description: t('tenantSubscriptionDashboard.management.subscriptions.description'),
      href: ROUTES.tenant.subscriptionsList,
      icon: UserGroupIcon,
      color: 'bg-indigo-500',
    },
    {
      name: t('tenantSubscriptionDashboard.management.invoices.name'),
      description: t('tenantSubscriptionDashboard.management.invoices.description'),
      href: ROUTES.tenant.invoices,
      icon: DocumentTextIcon,
      color: 'bg-indigo-500',
    },
    {
      name: t('tenantSubscriptionDashboard.management.coupons.name'),
      description: t('tenantSubscriptionDashboard.management.coupons.description'),
      href: ROUTES.tenant.coupons,
      icon: TicketIcon,
      color: 'bg-blue-500',
    },
  ]

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionDashboard.layoutTitle')}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="overflow-hidden rounded-xl bg-white shadow-sm">
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
    <TenantLayout title={t('tenantSubscriptionDashboard.layoutTitle')}>
      <div className="space-y-6">
        {/*  */}
        {stats && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantSubscriptionDashboard.stats.totalSubscriptions')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_subscriptions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantSubscriptionDashboard.stats.activeSubscriptions')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.active_subscriptions}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CurrencyDollarIcon className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantSubscriptionDashboard.stats.monthlyRevenue')}</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {formatCurrency(stats.monthly_revenue_cents)}
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
                    <UserGroupIcon className="h-8 w-8 text-indigo-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantSubscriptionDashboard.stats.customerCount')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_users}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/*  */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('tenantSubscriptionDashboard.sections.subscriptionManagement')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managementItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="group relative rounded-xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:border-gray-300 hover:shadow-md focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500"
                >
                  <div>
                    <span className={`${item.color} inline-flex rounded-xl p-3 ring-4 ring-white`}>
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

        {/*  */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('tenantSubscriptionDashboard.sections.quickActions')}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to={`${ROUTES.tenant.subscriptionProducts}?action=create`}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('tenantSubscriptionDashboard.actions.createProduct')}
              </Link>
              <Link
                to={`${ROUTES.tenant.plans}?action=create`}
                className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('tenantSubscriptionDashboard.actions.createPlan')}
              </Link>
              <Link
                to={`${ROUTES.tenant.prices}?action=create`}
                className="inline-flex items-center rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('tenantSubscriptionDashboard.actions.setPrice')}
              </Link>
              <Link
                to={`${ROUTES.tenant.coupons}?action=create`}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('tenantSubscriptionDashboard.actions.createCoupon')}
              </Link>
            </div>
          </div>
        </div>

        {/*  */}
        {stats && (
        <div className="rounded-xl bg-white shadow-sm">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('tenantSubscriptionDashboard.sections.subscriptionStatusOverview')}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-green-50 p-4">
                  <div className="flex items-center">
                    <ArrowTrendingUpIcon className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">{t('tenantSubscriptionDashboard.status.active')}</p>
                      <p className="text-2xl font-bold text-green-900">{stats.active_subscriptions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl bg-red-50 p-4">
                  <div className="flex items-center">
                    <ArrowTrendingDownIcon className="h-8 w-8 text-red-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{t('tenantSubscriptionDashboard.status.canceled')}</p>
                      <p className="text-2xl font-bold text-red-900">{stats.canceled_subscriptions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-xl bg-yellow-50 p-4">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-yellow-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800">{t('tenantSubscriptionDashboard.status.paused')}</p>
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
