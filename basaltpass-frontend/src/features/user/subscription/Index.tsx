import React, { useState, useEffect } from 'react'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PSkeleton, PBadge, PPageHeader } from '@ui'
import { listSubscriptions, cancelSubscription } from '@api/subscription/subscription'
import { SubscriptionResponse } from '@types/domain/subscription'
import { Link } from 'react-router-dom'
import { ChevronRightIcon, CubeIcon, WalletIcon, QuestionMarkCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function SubscriptionIndex() {
  const { t, locale } = useI18n()
  const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<SubscriptionResponse | null>(null)
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      setLoading(true)
      const res = await listSubscriptions()
      const raw = res.data
      let list: any = []
      if (Array.isArray(raw)) list = raw
      else if (Array.isArray(raw.data)) list = raw.data
      else if (Array.isArray(raw.data?.Data)) list = raw.data.Data
      setSubscriptions(list)
    } catch (error) {
      console.error('failed to load subscriptions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelClick = (subscription: SubscriptionResponse) => {
    setCancelTarget(subscription)
    setShowCancelModal(true)
  }

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    
    try {
      setCanceling(true)
      await cancelSubscription(cancelTarget.ID)
      await fetchSubscriptions()
      setShowCancelModal(false)
      setCancelTarget(null)
    } catch (error) {
      console.error('failed to cancel subscription:', error)
    } finally {
      setCanceling(false)
    }
  }

  const handleCancelCancel = () => {
    setShowCancelModal(false)
    setCancelTarget(null)
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'trialing':
        return <PBadge variant="warning">{t('pages.userSubscriptionIndex.status.trialing')}</PBadge>
      case 'active':
        return <PBadge variant="success">{t('pages.userSubscriptionIndex.status.active')}</PBadge>
      case 'canceled':
        return <PBadge variant="error">{t('pages.userSubscriptionIndex.status.canceled')}</PBadge>
      case 'past_due':
        return <PBadge variant="orange">{t('pages.userSubscriptionIndex.status.pastDue')}</PBadge>
      case 'unpaid':
        return <PBadge variant="error">{t('pages.userSubscriptionIndex.status.unpaid')}</PBadge>
      default:
        return <PBadge variant="default">{status}</PBadge>
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="py-6">
          <PSkeleton.Content cards={2} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <PPageHeader title={t('pages.userSubscriptionIndex.header.title')} description={t('pages.userSubscriptionIndex.header.description')} />
          <Link to={ROUTES.user.products}>
            <PButton variant="primary">
              <CubeIcon className="h-4 w-4 mr-2" />
              {t('pages.userSubscriptionIndex.actions.browseProducts')}
            </PButton>
          </Link>
        </div>

        <PCard>
          <div className="divide-y divide-gray-200">
            {subscriptions && subscriptions.length > 0 ? (
              subscriptions.map((sub) => (
                <div key={sub.ID} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {t('pages.userSubscriptionIndex.subscription.id', { id: sub.ID })}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        {t('pages.userSubscriptionIndex.subscription.product')}: {sub.CurrentPrice?.Plan?.Product?.Name || t('pages.userSubscriptionIndex.subscription.unknownProduct')} -
                        {sub.CurrentPrice?.Plan?.DisplayName || t('pages.userSubscriptionIndex.subscription.unknownPlan')}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {t('pages.userSubscriptionIndex.subscription.periodEnd')}: {new Date(sub.CurrentPeriodEnd).toLocaleDateString(locale)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        {statusBadge(sub.Status)}
                      </div>
                      {(sub.Status === 'trialing' || sub.Status === 'active') && (
                        <PButton
                          onClick={() => handleCancelClick(sub)}
                          variant="danger"
                          size="sm"
                        >
                          {t('pages.userSubscriptionIndex.actions.cancelSubscription')}
                        </PButton>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                {t('pages.userSubscriptionIndex.empty')}
              </div>
            )}
          </div>
        </PCard>

        {/*  */}
        <PCard variant="bordered" className="rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('pages.userSubscriptionIndex.links.title')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to={ROUTES.user.products}
              className="flex items-center rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <CubeIcon className="h-5 w-5 text-indigo-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('pages.userSubscriptionIndex.links.productsTitle')}</p>
                <p className="text-xs text-gray-500">{t('pages.userSubscriptionIndex.links.productsDesc')}</p>
              </div>
            </Link>
            <Link
              to={ROUTES.user.wallet}
              className="flex items-center rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <WalletIcon className="h-5 w-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('pages.userSubscriptionIndex.links.walletTitle')}</p>
                <p className="text-xs text-gray-500">{t('pages.userSubscriptionIndex.links.walletDesc')}</p>
              </div>
            </Link>
            <Link
              to={ROUTES.user.help}
              className="flex items-center rounded-lg bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <QuestionMarkCircleIcon className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">{t('pages.userSubscriptionIndex.links.helpTitle')}</p>
                <p className="text-xs text-gray-500">{t('pages.userSubscriptionIndex.links.helpDesc')}</p>
              </div>
            </Link>
          </div>
        </PCard>
      </div>

      {/*  */}
      {showCancelModal && cancelTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {t('pages.userSubscriptionIndex.cancelModal.title')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('pages.userSubscriptionIndex.cancelModal.confirmText')}
                </p>
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {t('pages.userSubscriptionIndex.subscription.id', { id: cancelTarget.ID })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {cancelTarget.CurrentPrice?.Plan?.Product?.Name || t('pages.userSubscriptionIndex.subscription.unknownProduct')} -
                    {cancelTarget.CurrentPrice?.Plan?.DisplayName || t('pages.userSubscriptionIndex.subscription.unknownPlan')}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('pages.userSubscriptionIndex.cancelModal.currentStatus')}: {cancelTarget.Status === 'trialing' ? t('pages.userSubscriptionIndex.status.trialing') : t('pages.userSubscriptionIndex.status.active')}
                  </p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {t('pages.userSubscriptionIndex.cancelModal.warning')}
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton
                  onClick={handleCancelCancel}
                  disabled={canceling}
                  variant="secondary"
                >
                  {t('pages.userSubscriptionIndex.cancelModal.cancel')}
                </PButton>
                <PButton
                  onClick={handleCancelConfirm}
                  disabled={canceling}
                  variant="danger"
                >
                  {canceling ? t('pages.userSubscriptionIndex.cancelModal.processing') : t('pages.userSubscriptionIndex.cancelModal.confirm')}
                </PButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
