import { useEffect, useState } from 'react'
import { uiAlert } from '@contexts/DialogContext'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { getOrder } from '@api/subscription/payment/order'
import { paymentAPI } from '@api/subscription/payment/payment'
import { OrderResponse } from '@api/subscription/payment/order'
import { ClockIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/solid'
import { ROUTES } from '@constants'
import { PButton, PBadge, PEmptyState } from '@ui'
import { useI18n } from '@shared/i18n'

export default function OrderConfirmPage() {
  const { t, locale } = useI18n()
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  useEffect(() => {
    if (orderId) {
      fetchOrder(parseInt(orderId))
    }
  }, [orderId])

  // 
  useEffect(() => {
    if (!order) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const expireTime = new Date(order.expires_at).getTime()
      const distance = expireTime - now

      if (distance > 0) {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        setTimeLeft(t('userOrderConfirm.timeLeft.minutesSeconds', { minutes, seconds }))
      } else {
        setTimeLeft(t('userOrderConfirm.timeLeft.expired'))
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [order])

  const fetchOrder = async (id: number) => {
    try {
      setLoading(true)
      const orderData = await getOrder(id)
      setOrder(orderData)
    } catch (error: any) {
      console.error(t('userOrderConfirm.logs.fetchOrderFailed'), error)
      if (error.response?.status === 404) {
        navigate(ROUTES.user.orders)
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!order) return

    try {
      setPaying(true)

      // 
      const paymentData = {
        amount: order.total_amount,
        currency: order.currency,
        description: order.description,
        metadata: {
          order_id: order.id,
          order_number: order.order_number
        }
      }


      const paymentIntentResponse = await paymentAPI.createPaymentIntent(paymentData)
      
      
      const sessionData = {
        payment_intent_id: paymentIntentResponse.payment_intent.ID,
        success_url: `${window.location.origin}/orders/${order.id}/success?paid=1`,
        cancel_url: `${window.location.origin}/orders/${order.id}/confirm`
      }

      
      const sessionResponse = await paymentAPI.createPaymentSession(sessionData)
      
      
      // （）
        const checkoutUrl = `${window.location.origin}/api/v1/payment/checkout/${sessionResponse.session.StripeSessionID}`
      
      window.location.href = checkoutUrl 

    } catch (error: any) {
      console.error(t('userOrderConfirm.logs.createPaymentFailed'), error)
      uiAlert(error.response?.data?.error || t('userOrderConfirm.errors.createPaymentFailed'))
    } finally {
      setPaying(false)
    }
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2)
  }

  const isExpired = () => {
    if (!order) return false
    return new Date(order.expires_at) < new Date()
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">{t('userOrderConfirm.loading')}</div>
        </div>
      </Layout>
    )
  }

  if (!order) {
    return (
      <Layout>
        <PEmptyState
          icon={<ExclamationTriangleIcon className="h-12 w-12" />}
          title={t('userOrderConfirm.empty.title')}
          description={t('userOrderConfirm.empty.description')}
          action={{ label: t('userOrderConfirm.actions.backToProducts'), onClick: () => navigate(ROUTES.user.products) }}
        />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCartIcon className="mr-3 h-7 w-7 text-indigo-600" />
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">{t('userOrderConfirm.title')}</h1>
                    <p className="mt-1 text-sm text-gray-500">{order.order_number}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <PBadge variant={
                    order.status === 'pending' ? 'warning' :
                    order.status === 'paid' ? 'success' :
                    order.status === 'expired' ? 'error' : 'default'
                  }>
                    {order.status === 'pending' ? t('userOrderConfirm.status.pending') :
                     order.status === 'paid' ? t('userOrderConfirm.status.paid') :
                     order.status === 'expired' ? t('userOrderConfirm.status.expired') :
                     order.status === 'cancelled' ? t('userOrderConfirm.status.cancelled') : order.status}
                  </PBadge>
                </div>
              </div>
            </div>

            <div className="grid gap-8 px-8 py-8 lg:grid-cols-3">
              <div className="space-y-8 lg:col-span-2">
                <section>
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('userOrderConfirm.sections.orderInfo')}</h3>
                  <dl className="grid grid-cols-1 gap-5 rounded-xl border border-gray-200 bg-gray-50 p-5 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('userOrderConfirm.fields.orderNumber')}</dt>
                      <dd className="mt-1 font-mono text-sm text-gray-900">{order.order_number}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('userOrderConfirm.fields.createdAt')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(order.created_at).toLocaleString(locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('userOrderConfirm.fields.expiresAt')}</dt>
                      <dd className="mt-1 text-sm text-gray-900">{new Date(order.expires_at).toLocaleString(locale)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('userOrderConfirm.fields.timeLeft')}</dt>
                      <dd className={`mt-1 flex items-center text-sm font-semibold ${isExpired() ? 'text-red-600' : 'text-orange-600'}`}>
                        <ClockIcon className="mr-1 h-4 w-4" />
                        {timeLeft}
                      </dd>
                    </div>
                  </dl>
                </section>

                {order.price && (
                  <section>
                    <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('userOrderConfirm.sections.productDetail')}</h3>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-gray-900">
                            {order.price.plan?.product?.name} - {order.price.plan?.display_name}
                          </h4>
                          <p className="mt-1 text-sm leading-6 text-gray-600">{order.description}</p>
                          <div className="mt-3 flex items-center text-sm text-gray-700">
                            <span>{t('userOrderConfirm.quantity', { count: order.quantity })}</span>
                            <span className="mx-2">|</span>
                            <span>
                              {t('userOrderConfirm.billing', {
                                count: order.price.billing_interval_count > 1 ? order.price.billing_interval_count : '',
                                unit: order.price.billing_interval === 'month'
                                  ? t('userOrderConfirm.billingUnits.month')
                                  : order.price.billing_interval === 'year'
                                  ? t('userOrderConfirm.billingUnits.year')
                                  : order.price.billing_interval === 'week'
                                  ? t('userOrderConfirm.billingUnits.week')
                                  : order.price.billing_interval === 'day'
                                  ? t('userOrderConfirm.billingUnits.day')
                                  : order.price.billing_interval
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="space-y-6 lg:col-span-1">
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 lg:sticky lg:top-6">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">{t('userOrderConfirm.sections.priceDetail')}</h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">{t('userOrderConfirm.price.base')}</dt>
                      <dd className="text-sm text-gray-900">¥{formatAmount(order.base_amount)}</dd>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">{t('userOrderConfirm.price.discount')}</dt>
                        <dd className="text-sm text-red-600">-¥{formatAmount(order.discount_amount)}</dd>
                      </div>
                    )}
                    {order.coupon && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">{t('userOrderConfirm.price.coupon')}</dt>
                        <dd className="text-sm text-gray-900">{order.coupon.code}</dd>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <dt className="text-base font-medium text-gray-900">{t('userOrderConfirm.price.total')}</dt>
                        <dd className="text-base font-medium text-gray-900">¥{formatAmount(order.total_amount)}</dd>
                      </div>
                    </div>
                  </dl>

                  <div className="mt-6 flex flex-col gap-3">
                    {order.status === 'pending' && !isExpired() ? (
                      <PButton
                        onClick={handlePayment}
                        disabled={paying}
                        loading={paying}
                        variant="primary"
                        leftIcon={<CreditCardIcon className="h-5 w-5" />}
                        fullWidth
                      >
                        {t('userOrderConfirm.actions.payNow', { amount: formatAmount(order.total_amount) })}
                      </PButton>
                    ) : order.status === 'paid' ? (
                      <PButton variant="secondary" disabled fullWidth leftIcon={<CheckCircleIcon className="h-5 w-5" />}>
                        {t('userOrderConfirm.actions.paid')}
                      </PButton>
                    ) : (
                      <PButton variant="secondary" disabled fullWidth leftIcon={<ExclamationTriangleIcon className="h-5 w-5" />}>
                        {isExpired() ? t('userOrderConfirm.actions.expired') : t('userOrderConfirm.actions.cancelled')}
                      </PButton>
                    )}

                    <Link to={ROUTES.user.products}>
                      <PButton variant="secondary" fullWidth>{t('userOrderConfirm.actions.backToProducts')}</PButton>
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </div>
      </div>
    </Layout>
  )
} 
