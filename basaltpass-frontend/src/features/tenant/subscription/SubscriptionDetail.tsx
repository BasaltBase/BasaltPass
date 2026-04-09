import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { getTenantUserSubscription, Subscription, tenantSubscriptionAPI } from '@api/tenant/subscription'
import { ROUTES } from '@constants/routes'
import { useI18n } from '@shared/i18n'
import { PSkeleton, PBadge, PButton, PCard, PPageHeader } from '@ui'

function fmtDate(value?: string | null, locale?: string) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString(locale)
}

export default function TenantSubscriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, locale } = useI18n()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  const subscriptionId = Number(id)

  const fetchDetail = async () => {
    try {
      setLoading(true)
      setError('')

      if (!subscriptionId || Number.isNaN(subscriptionId)) {
        setError(t('tenantSubscriptionDetail.errors.invalidId'))
        return
      }

      const data = await getTenantUserSubscription(subscriptionId)
      setSubscription(data)
    } catch (err: any) {
      console.error(t('tenantSubscriptionDetail.logs.fetchFailed'), err)
      setError(err?.response?.data?.error || t('tenantSubscriptionDetail.errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId])

  const handleCancel = async () => {
    if (!subscription) return
    if (subscription.Status !== 'active') return

    const ok = await uiConfirm(t('tenantSubscriptionDetail.confirm.cancel'))
    if (!ok) return

    const reason = await uiPrompt(t('tenantSubscriptionDetail.modal.reasonPrompt')) || undefined

    try {
      await tenantSubscriptionAPI.cancelSubscription(subscription.ID, { reason })
      await fetchDetail()
    } catch (err) {
      console.error(t('tenantSubscriptionDetail.logs.cancelFailed'), err)
      uiAlert(t('tenantSubscriptionDetail.errors.cancelFailed'))
    }
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantSubscriptionDetail.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.DetailPage />
        </div>
      </TenantLayout>
    )
  }

  if (error || !subscription) {
    return (
      <TenantLayout title={t('tenantSubscriptionDetail.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error || t('tenantSubscriptionDetail.empty.notFound')}</h3>
            <div className="mt-6 flex items-center justify-center gap-3">
              <PButton onClick={() => navigate(-1)} variant="secondary">
                {t('tenantSubscriptionDetail.actions.back')}
              </PButton>
              <PButton onClick={fetchDetail}>
                {t('tenantSubscriptionDetail.actions.retry')}
              </PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  const status = tenantSubscriptionAPI.formatSubscriptionStatus(subscription.Status)
  const statusVariant =
    status.color === 'green' ? 'success'
    : status.color === 'red' ? 'error'
    : status.color === 'yellow' ? 'warning'
    : status.color === 'orange' ? 'orange'
    : 'default'

  return (
    <TenantLayout title={t('tenantSubscriptionDetail.layoutTitle')}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link to={ROUTES.tenant.subscriptions} className="text-sm text-gray-500 hover:text-gray-700">
                {t('tenantSubscriptionDetail.actions.backToList')}
              </Link>
              <PBadge variant={statusVariant as any}>{status.text}</PBadge>
            </div>
            <PPageHeader
              title={t('tenantSubscriptionDetail.header.title', { id: subscription.ID })}
              description={t('tenantSubscriptionDetail.header.description', {
                userId: subscription.UserID,
                createdAt: fmtDate(subscription.CreatedAt, locale),
              })}
            />
          </div>

          <div className="flex items-center gap-2">
            <PButton variant="secondary" onClick={() => navigate(`/tenant/subscriptions/subscriptions`)}>{t('tenantSubscriptionDetail.actions.back')}</PButton>
            <PButton variant="danger" onClick={handleCancel} disabled={subscription.Status !== 'active'}>{t('tenantSubscriptionDetail.actions.cancelSubscription')}</PButton>
          </div>
        </div>

        <PCard className="rounded-xl p-0 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-medium text-gray-900">{t('tenantSubscriptionDetail.sections.basic')}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.status')}</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.Status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.quantity')}</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.Quantity ?? 1}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.currentPeriod')}</div>
              <div className="mt-1 text-sm text-gray-900">
                {fmtDate(subscription.CurrentPeriodStart, locale)} ~ {fmtDate(subscription.CurrentPeriodEnd, locale)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.startAt')}</div>
              <div className="mt-1 text-sm text-gray-900">{fmtDate(subscription.StartAt, locale)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.canceledAt')}</div>
              <div className="mt-1 text-sm text-gray-900">{fmtDate(subscription.CanceledAt, locale)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.cancelAt')}</div>
              <div className="mt-1 text-sm text-gray-900">{fmtDate(subscription.CancelAt, locale)}</div>
            </div>
          </div>
        </PCard>

        <PCard className="rounded-xl p-0 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-medium text-gray-900">{t('tenantSubscriptionDetail.sections.pricing')}</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.currentPriceId')}</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.CurrentPriceID}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.nextPriceId')}</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.NextPriceID ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.couponId')}</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.CouponID ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">{t('tenantSubscriptionDetail.fields.gatewaySubscriptionId')}</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.GatewaySubscriptionID ?? '-'}</div>
            </div>
          </div>
        </PCard>
      </div>
    </TenantLayout>
  )
}
