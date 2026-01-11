import React, { useState, useEffect } from 'react'
import Layout from '../../../components/Layout'
import { PCard, PButton } from '../../../components'
import { listProducts } from '@api/subscription/subscription'
import { createOrder, CreateOrderRequest } from '@api/subscription/payment/order'
import { Product, Price } from '../../../types/subscription'
import { Link, useNavigate } from 'react-router-dom'
import client from '../../../api/client'
import { ChevronRightIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { CubeIcon, WalletIcon, QuestionMarkCircleIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingPrice, setSubscribingPrice] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await listProducts()
      const raw = res.data

      let list: any = []
      if (Array.isArray(raw)) list = raw
      else if (Array.isArray(raw.data)) list = raw.data
      else if (Array.isArray(raw.data?.Data)) list = raw.data.Data

      setProducts(list)
    } catch (error) {
      console.error('获取产品列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (price: Price) => {
    try {
      setSubscribingPrice(price.ID)
  
      
      // 检查是否有token
      const token = localStorage.getItem('access_token')
      if (!token) {

        navigate('/auth/login')
        return
      }
      
      // 通过API获取当前用户信息
      
      const userResponse = await client.get('/api/v1/user/profile')
      const user = userResponse.data
      
      
      // 创建订单
      const orderData: CreateOrderRequest = {
        user_id: user.id,
        price_id: price.ID,
        quantity: 1
      }
      
      
      const order = await createOrder(orderData)
      
      
      // 跳转到订单确认页面
      const confirmUrl = `/orders/${order.id}/confirm`
      
      navigate(confirmUrl)
      
    } catch (error: any) {
      console.error('创建订单失败:', error)
      console.error('错误详情:', error.response)
      
      // 如果是401错误，说明token无效，跳转到登录页面
      if (error.response?.status === 401) {

        navigate('/auth/login')
        return
      }
      
      alert(error.response?.data?.error || error.message || '创建订单失败，请重试')
    } finally {
      setSubscribingPrice(null)
    }
  }

  const formatPrice = (price: Price) => {
    const amount = (price.AmountCents / 100).toFixed(2)
    const period = price.BillingPeriod === 'month' ? '月' : 
                   price.BillingPeriod === 'year' ? '年' : 
                   price.BillingPeriod === 'week' ? '周' : 
                   price.BillingPeriod === 'day' ? '日' : price.BillingPeriod
    const interval = price.BillingInterval > 1 ? `${price.BillingInterval}` : ''
    return `¥${amount}/${interval}${period}`
  }

  const getPriceColor = (index: number) => {
    const colors = [
      'text-blue-600 bg-blue-50 border-blue-200',
      'text-emerald-600 bg-emerald-50 border-emerald-200',
      'text-purple-600 bg-purple-50 border-purple-200',
      'text-orange-600 bg-orange-50 border-orange-200'
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">产品与套餐</h1>
            <p className="mt-1 text-sm text-gray-500">
              浏览可用的产品和套餐，选择适合您需求的订阅方案
            </p>
          </div>
          <Link to="/subscriptions">
            <PButton variant="primary">
              <CreditCardIcon className="h-4 w-4 mr-2" />
              我的订阅
            </PButton>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
          {products && products.length > 0 ? (
            products.map((product) => (
              <PCard key={product.ID} variant="bordered" className="p-6">
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0">
                      <CubeIcon className="h-10 w-10 text-indigo-600" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-xl font-semibold text-gray-900">{product.Name}</h3>
                      <p className="text-sm text-gray-500">产品代码: {product.Code}</p>
                    </div>
                  </div>
                  
                  {product.Description && (
                    <p className="text-gray-600 mb-4">{product.Description}</p>
                  )}
                  
                  {product.Plans && product.Plans.length > 0 && (
                    <div className="space-y-4">
                        {product.Plans.map((plan) => (
                        <div key={plan.ID} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{plan.DisplayName}</h4>
                              <p className="text-sm text-gray-500">版本 v{plan.PlanVersion}</p>
                            </div>
                            <SparklesIcon className="h-5 w-5 text-indigo-600" />
                          </div>
                          
                          {plan.Features && plan.Features.length > 0 && (
                            <ul className="mb-4 space-y-2">
                              {plan.Features.map(feature => (
                                <li key={feature.ID} className="flex items-center text-sm text-gray-600">
                                  <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>
                                    <span className="font-medium">{feature.FeatureKey}</span>
                                    {feature.IsUnlimited ? (
                                      <span className="ml-1 text-gray-500">(无限制)</span>
                                    ) : (
                                      <>
                                        {feature.ValueText && <span className="ml-1">: {feature.ValueText}</span>}
                                        {feature.ValueNumeric !== undefined && <span className="ml-1">: {feature.ValueNumeric}</span>}
                                        {feature.Unit && <span className="ml-1">{feature.Unit}</span>}
                                      </>
                                    )}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {plan.Prices && plan.Prices.length > 0 ? (
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">可选价格:</h5>
                              <div className="grid gap-2">
                                {plan.Prices.map((price, priceIndex) => (
                                  <div key={price.ID} className={`flex items-center justify-between p-3 rounded-md border ${getPriceColor(priceIndex)}`}>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold">{formatPrice(price)}</span>
                                        {price.TrialDays && price.TrialDays > 0 && (
                                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            {price.TrialDays}天免费试用
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs mt-1 opacity-75">
                                        {price.UsageType === 'license' ? '许可证' : 
                                         price.UsageType === 'metered' ? '按量计费' : '分层计费'}
                                      </p>
                                    </div>
                                    <PButton
                                      onClick={() => handleSubscribe(price)}
                                      disabled={subscribingPrice === price.ID}
                                      variant="primary"
                                      size="sm"
                                      loading={subscribingPrice === price.ID}
                                      className="ml-3"
                                    >
                                      立即订阅
                                      <ArrowRightIcon className="h-4 w-4 ml-1" />
                                    </PButton>
                          </div>
                        ))}
                      </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">暂无可用价格选项</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </PCard>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无产品</h3>
              <p className="mt-1 text-sm text-gray-500">当前没有可用的产品。</p>
            </div>
          )}
        </div>

        {/* 相关链接 */}
        <PCard variant="bordered" className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">相关链接</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/subscriptions"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <CreditCardIcon className="h-5 w-5 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">我的订阅</p>
                <p className="text-xs text-gray-500">查看和管理您的订阅</p>
              </div>
            </Link>
            <Link
              to="/wallet"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <WalletIcon className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">钱包</p>
                <p className="text-xs text-gray-500">管理您的账户余额</p>
              </div>
            </Link>
            <Link
              to="/help"
              className="flex items-center p-3 bg-white rounded-md shadow-sm hover:shadow-md transition-shadow"
            >
              <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">帮助中心</p>
                <p className="text-xs text-gray-500">获取订阅相关帮助</p>
              </div>
            </Link>
          </div>
        </PCard>
      </div>
    </Layout>
  )
} 