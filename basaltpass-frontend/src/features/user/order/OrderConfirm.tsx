import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { getOrder } from '@api/subscription/payment/order'
import { paymentAPI } from '@api/subscription/payment/payment'
import { OrderResponse } from '@api/subscription/payment/order'
import { ChevronRightIcon, ClockIcon, CreditCardIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/solid'
import { ROUTES } from '@constants'

export default function OrderConfirmPage() {
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

  // 计算倒计时
  useEffect(() => {
    if (!order) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const expireTime = new Date(order.expires_at).getTime()
      const distance = expireTime - now

      if (distance > 0) {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        setTimeLeft(`${minutes}分${seconds}秒`)
      } else {
        setTimeLeft('已过期')
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
      console.error('获取订单失败:', error)
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

      // 创建支付意图
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
        success_url: `${window.location.origin}/orders/${order.id}/success`,
        cancel_url: `${window.location.origin}/orders/${order.id}/confirm`
      }

      
      const sessionResponse = await paymentAPI.createPaymentSession(sessionData)
      
      
      // 跳转到支付页面（后端提供的支付模拟页面）
  const checkoutUrl = `http://localhost:8080/api/v1/payment/checkout/${sessionResponse.session.StripeSessionID}`
      
      window.location.href = checkoutUrl 

    } catch (error: any) {
      console.error('创建支付失败:', error)
      uiAlert(error.response?.data?.error || '创建支付失败，请重试')
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
          <div className="text-lg">加载中...</div>
        </div>
      </Layout>
    )
  }

  if (!order) {
    return (
      <Layout>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">订单不存在</h3>
          <p className="mt-1 text-sm text-gray-500">请检查订单链接是否正确。</p>
          <div className="mt-6">
            <Link
              to={ROUTES.user.products}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              返回产品页面
            </Link>
          </div>
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
              <Link to={ROUTES.user.dashboard} className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <Link to={ROUTES.user.products} className="ml-4 text-gray-400 hover:text-gray-500">
                  产品与套餐
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">订单确认</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="max-w-2xl mx-auto">
          {/* 订单状态 */}
          <div className="bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ShoppingCartIcon className="h-6 w-6 text-indigo-600 mr-2" />
                  <h1 className="text-xl font-semibold text-gray-900">订单确认</h1>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'paid' ? 'bg-green-100 text-green-800' :
                    order.status === 'expired' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status === 'pending' ? '待支付' :
                     order.status === 'paid' ? '已支付' :
                     order.status === 'expired' ? '已过期' :
                     order.status === 'cancelled' ? '已取消' : order.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-6">
              {/* 订单基本信息 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">订单信息</h3>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">订单号</dt>
                    <dd className="text-sm text-gray-900 font-mono">{order.order_number}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">创建时间</dt>
                    <dd className="text-sm text-gray-900">{new Date(order.created_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">过期时间</dt>
                    <dd className="text-sm text-gray-900">{new Date(order.expires_at).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">剩余时间</dt>
                    <dd className={`text-sm font-medium flex items-center ${isExpired() ? 'text-red-600' : 'text-orange-600'}`}>
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {timeLeft}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 产品信息 */}
              {order.price && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">产品详情</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">
                          {order.price.plan?.product?.name} - {order.price.plan?.display_name}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{order.description}</p>
                        <div className="mt-2 flex items-center text-sm text-gray-600">
                          <span>数量: {order.quantity}</span>
                          <span className="mx-2">|</span>
                          <span>
                            {order.price.billing_interval_count > 1 ? order.price.billing_interval_count : ''}
                            {order.price.billing_interval === 'month' ? '月' : 
                             order.price.billing_interval === 'year' ? '年' : 
                             order.price.billing_interval === 'week' ? '周' : 
                             order.price.billing_interval === 'day' ? '日' : order.price.billing_interval}计费
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 价格详情 */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">价格详情</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">基础价格</dt>
                      <dd className="text-sm text-gray-900">¥{formatAmount(order.base_amount)}</dd>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">优惠折扣</dt>
                        <dd className="text-sm text-red-600">-¥{formatAmount(order.discount_amount)}</dd>
                      </div>
                    )}
                    {order.coupon && (
                      <div className="flex justify-between">
                        <dt className="text-sm text-gray-600">优惠券</dt>
                        <dd className="text-sm text-gray-900">{order.coupon.code}</dd>
                      </div>
                    )}
                    <div className="border-t border-gray-200 pt-2">
                      <div className="flex justify-between">
                        <dt className="text-base font-medium text-gray-900">总计</dt>
                        <dd className="text-base font-medium text-gray-900">¥{formatAmount(order.total_amount)}</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>

              {/* 支付按钮 */}
              <div className="flex flex-col sm:flex-row gap-3">
                {order.status === 'pending' && !isExpired() ? (
                  <button
                    onClick={handlePayment}
                    disabled={paying}
                    className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {paying ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        处理中...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <CreditCardIcon className="h-5 w-5 mr-2" />
                        立即支付 ¥{formatAmount(order.total_amount)}
                      </div>
                    )}
                  </button>
                ) : order.status === 'paid' ? (
                  <div className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-green-300 text-base font-medium rounded-md text-green-700 bg-green-50">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    订单已支付
                  </div>
                ) : (
                  <div className="flex-1 inline-flex justify-center items-center px-6 py-3 border border-red-300 text-base font-medium rounded-md text-red-700 bg-red-50">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    {isExpired() ? '订单已过期' : '订单已取消'}
                  </div>
                )}
                
                <Link
                  to={ROUTES.user.products}
                  className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  返回产品页面
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
} 