import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PSkeleton, PPageHeader, PEmptyState } from '@ui'
import { listProducts } from '@api/subscription/subscription'
import { createOrder, CreateOrderRequest } from '@api/subscription/payment/order'
import { Product, Price } from '@types/domain/subscription'
import { Link, useNavigate } from 'react-router-dom'
import client from '@api/client'
import { ChevronRightIcon, CreditCardIcon } from '@heroicons/react/24/outline'
import { CubeIcon, WalletIcon, QuestionMarkCircleIcon, SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { getAccessToken } from '@utils/auth'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function ProductsPage() {
  const { t } = useI18n()
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
      else if (Array.isArray(raw.data?.data)) list = raw.data.data
      else if (Array.isArray(raw.data?.Data)) list = raw.data.Data

      setProducts(list)
    } catch (error) {
      console.error('failed to load product list:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (price: Price) => {
    try {
      setSubscribingPrice(price.ID)
  
      
      // token
        const token = getAccessToken()
      if (!token) {

        navigate(ROUTES.user.login)
        return
      }
      
      // API
      
      const userResponse = await client.get('/api/v1/user/profile')
      const user = userResponse.data
      
      
      // 
      const orderData: CreateOrderRequest = {
        user_id: user.id,
        price_id: price.ID,
        quantity: 1
      }
      
      
      const order = await createOrder(orderData)
      
      
      // 
      const confirmUrl = `/orders/${order.id}/confirm`
      
      navigate(confirmUrl)
      
    } catch (error: any) {
      console.error('failed to create order:', error)
      console.error('error detail:', error.response)
      
      // 401，token，
      if (error.response?.status === 401) {

        navigate(ROUTES.user.login)
        return
      }
      
      uiAlert(error.response?.data?.error || error.message || t('pages.userSubscriptionProducts.errors.createOrderFailed'))
    } finally {
      setSubscribingPrice(null)
    }
  }

  const formatPrice = (price: Price) => {
    const amount = (price.AmountCents / 100).toFixed(2)
    const period = price.BillingPeriod === 'month' ? t('pages.userSubscriptionProducts.period.month') :
                   price.BillingPeriod === 'year' ? t('pages.userSubscriptionProducts.period.year') :
                   price.BillingPeriod === 'week' ? t('pages.userSubscriptionProducts.period.week') :
                   price.BillingPeriod === 'day' ? t('pages.userSubscriptionProducts.period.day') : price.BillingPeriod
    const interval = price.BillingInterval > 1 ? `${price.BillingInterval}` : ''
    return `¥${amount}/${interval}${period}`
  }

  const getPriceColor = (index: number) => {
    const colors = [
      'text-blue-600 bg-blue-50 border-blue-200',
      'text-green-600 bg-green-50 border-green-200',
      'text-indigo-600 bg-indigo-50 border-indigo-200',
      'text-yellow-600 bg-yellow-50 border-yellow-200'
    ]
    return colors[index % colors.length]
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.AppCardGrid count={6} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PPageHeader title={t('pages.userSubscriptionProducts.header.title')} description={t('pages.userSubscriptionProducts.header.description')} />
          <Link to={ROUTES.user.subscriptions}>
            <PButton variant="primary">
              <CreditCardIcon className="h-4 w-4 mr-2" />
              {t('pages.userSubscriptionProducts.actions.mySubscriptions')}
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
                      <p className="text-sm text-gray-500">{t('pages.userSubscriptionProducts.productCode')}: {product.Code}</p>
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
                              <p className="text-sm text-gray-500">{t('pages.userSubscriptionProducts.version')} v{plan.PlanVersion}</p>
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
                                      <span className="ml-1 text-gray-500">({t('pages.userSubscriptionProducts.unlimited')})</span>
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
                              <h5 className="text-sm font-medium text-gray-700 mb-2">{t('pages.userSubscriptionProducts.availablePrices')}</h5>
                              <div className="grid gap-2">
                                {plan.Prices.map((price, priceIndex) => (
                                  <div key={price.ID} className={`flex items-center justify-between rounded-lg border p-3 ${getPriceColor(priceIndex)}`}>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-lg font-semibold">{formatPrice(price)}</span>
                                        {price.TrialDays && price.TrialDays > 0 && (
                                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            {t('pages.userSubscriptionProducts.trialDays', { days: price.TrialDays })}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs mt-1 opacity-75">
                                        {price.UsageType === 'license' ? t('pages.userSubscriptionProducts.usage.license') :
                                         price.UsageType === 'metered' ? t('pages.userSubscriptionProducts.usage.metered') : t('pages.userSubscriptionProducts.usage.tiered')}
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
                                      {t('pages.userSubscriptionProducts.actions.subscribeNow')}
                                      <ArrowRightIcon className="h-4 w-4 ml-1" />
                                    </PButton>
                          </div>
                        ))}
                      </div>
                            </div>
                          ) : (
                            <div className="text-center py-4 text-gray-500">
                              <p className="text-sm">{t('pages.userSubscriptionProducts.noPrice')}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </PCard>
            ))
          ) : (
            <div className="col-span-full">
              <PEmptyState
                icon={<CubeIcon className="h-12 w-12" />}
                title={t('pages.userSubscriptionProducts.empty.title')}
                description={t('pages.userSubscriptionProducts.empty.description')}
              />
            </div>
          )}
        </div>

        {/*  */}
        <PCard variant="bordered" className="rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('pages.userSubscriptionProducts.links.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={ROUTES.user.subscriptions}
              className="flex items-center rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <CreditCardIcon className="h-5 w-5 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('pages.userSubscriptionProducts.links.subscriptionsTitle')}</p>
                <p className="text-xs text-gray-500">{t('pages.userSubscriptionProducts.links.subscriptionsDesc')}</p>
              </div>
            </Link>
            <Link
              to={ROUTES.user.wallet}
              className="flex items-center rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <WalletIcon className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('pages.userSubscriptionProducts.links.walletTitle')}</p>
                <p className="text-xs text-gray-500">{t('pages.userSubscriptionProducts.links.walletDesc')}</p>
              </div>
            </Link>
            <Link
              to={ROUTES.user.help}
              className="flex items-center rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('pages.userSubscriptionProducts.links.helpTitle')}</p>
                <p className="text-xs text-gray-500">{t('pages.userSubscriptionProducts.links.helpDesc')}</p>
              </div>
            </Link>
          </div>
        </PCard>
      </div>
    </Layout>
  )
} 
