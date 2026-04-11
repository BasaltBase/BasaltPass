import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { listOrders, OrderResponse, OrderStatus } from '@api/subscription/payment/order'
import { PBadge, PButton, PCard, PEmptyState, PPageHeader, PSkeleton } from '@ui'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'
import { CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

type OrderFilter = 'all' | 'pending' | 'paid' | 'expired'

export default function OrderListPage() {
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderResponse[]>([])
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('all')

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await listOrders(100)
      setOrders(data || [])
    } catch (error) {
      console.error(t('userOrderList.logs.fetchOrdersFailed'), error)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') {
      return orders
    }
    return orders.filter((order) => order.status === activeFilter)
  }, [orders, activeFilter])

  const countByStatus = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      paid: orders.filter((order) => order.status === 'paid').length,
      expired: orders.filter((order) => order.status === 'expired').length,
    }
  }, [orders])

  const statusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <PBadge variant="warning">{t('userOrderList.status.pending')}</PBadge>
      case 'paid':
        return <PBadge variant="success">{t('userOrderList.status.paid')}</PBadge>
      case 'expired':
        return <PBadge variant="error">{t('userOrderList.status.expired')}</PBadge>
      case 'cancelled':
        return <PBadge variant="default">{t('userOrderList.status.cancelled')}</PBadge>
      default:
        return <PBadge variant="default">{status}</PBadge>
    }
  }

  const formatAmount = (cents: number) => (cents / 100).toFixed(2)

  const filters: Array<{ key: OrderFilter; label: string; count: number }> = [
    { key: 'all', label: t('userOrderList.filters.all'), count: countByStatus.all },
    { key: 'pending', label: t('userOrderList.filters.pending'), count: countByStatus.pending },
    { key: 'paid', label: t('userOrderList.filters.paid'), count: countByStatus.paid },
    { key: 'expired', label: t('userOrderList.filters.expired'), count: countByStatus.expired },
  ]

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.Content cards={3} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <PPageHeader title={t('userOrderList.header.title')} description={t('userOrderList.header.description')} />
          <PButton variant="secondary" onClick={fetchOrders}>{t('userOrderList.actions.refresh')}</PButton>
        </div>

        <PCard>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setActiveFilter(filter.key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  activeFilter === filter.key
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </PCard>

        <PCard>
          {filteredOrders.length === 0 ? (
            <div className="py-8">
              <PEmptyState
                icon={<ExclamationTriangleIcon className="h-12 w-12" />}
                title={t('userOrderList.empty.title')}
                description={t('userOrderList.empty.description')}
                action={{
                  label: t('userOrderList.empty.browseProducts'),
                  onClick: () => navigate(ROUTES.user.products),
                }}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <div key={order.id} className="py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-700">{order.order_number}</span>
                        {statusBadge(order.status)}
                      </div>
                      <p className="text-sm text-gray-700">{order.description}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {t('userOrderList.fields.createdAt')}: {new Date(order.created_at).toLocaleString(locale)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t('userOrderList.fields.expiresAt')}: {new Date(order.expires_at).toLocaleString(locale)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="mr-2 text-right">
                        <p className="text-sm text-gray-500">{t('userOrderList.fields.totalAmount')}</p>
                        <p className="text-base font-semibold text-gray-900">¥{formatAmount(order.total_amount)}</p>
                      </div>

                      {order.status === 'pending' ? (
                        <Link to={`/orders/${order.id}/confirm`}>
                          <PButton variant="primary" leftIcon={<CreditCardIcon className="h-4 w-4" />}>
                            {t('userOrderList.actions.payNow')}
                          </PButton>
                        </Link>
                      ) : (
                        <Link to={`/orders/${order.id}/confirm`}>
                          <PButton variant="secondary">{t('userOrderList.actions.viewDetail')}</PButton>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PCard>
      </div>
    </Layout>
  )
}
