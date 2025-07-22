import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { getOrder } from '../../api/order'
import { OrderResponse } from '../../api/order'
import { CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { CreditCardIcon, DocumentTextIcon, HomeIcon } from '@heroicons/react/24/outline'

export default function OrderSuccessPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      fetchOrder(parseInt(orderId))
    }
  }, [orderId])

  const fetchOrder = async (id: number) => {
    try {
      setLoading(true)
      const orderData = await getOrder(id)
      setOrder(orderData)
    } catch (error: any) {
      console.error('获取订单失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (cents: number) => {
    return (cents / 100).toFixed(2)
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

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* 成功图标 */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircleIcon className="h-12 w-12 text-green-600" />
          </div>
          
          {/* 标题 */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">支付成功！</h1>
            <p className="text-lg text-gray-600">感谢您的订阅，您的订单已完成支付。</p>
          </div>
        </div>

        {order && (
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
            <div className="bg-white py-8 px-6 shadow-lg rounded-lg sm:px-10">
              {/* 订单信息卡片 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">订单详情</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    已支付
                  </span>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">订单号</span>
                    <span className="text-sm font-mono text-gray-900">{order.order_number}</span>
                  </div>
                  
                  {order.price && (
                    <div className="flex justify-between items-start">
                      <span className="text-sm text-gray-600">产品</span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {order.price.plan?.product?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.price.plan?.display_name}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">支付金额</span>
                    <span className="text-lg font-semibold text-gray-900">¥{formatAmount(order.total_amount)}</span>
                  </div>
                  
                  {order.paid_at && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">支付时间</span>
                      <span className="text-sm text-gray-900">{new Date(order.paid_at).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 下一步提示 */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">订阅已激活</h4>
                    <p className="text-sm text-blue-700">
                      您的订阅已成功激活，现在可以开始使用我们的服务了！
                    </p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-3">
                <Link
                  to="/subscriptions"
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <CreditCardIcon className="h-4 w-4 mr-2" />
                  查看我的订阅
                </Link>
                
                <Link
                  to="/dashboard"
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  返回控制台
                </Link>
                
                <Link
                  to="/products"
                  className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <DocumentTextIcon className="h-4 w-4 mr-2" />
                  查看更多产品
                </Link>
              </div>
            </div>
            
            {/* 底部提示 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                如有任何问题，请查看我们的 
                <Link to="/help" className="font-medium text-indigo-600 hover:text-indigo-500">
                  帮助中心
                </Link>
                或联系客服。
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 