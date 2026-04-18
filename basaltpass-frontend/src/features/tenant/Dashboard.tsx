import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellIcon,
  ChartBarIcon,
  CubeIcon,
  CreditCardIcon,
  ServerIcon,
  ShieldCheckIcon,
  UsersIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { PSkeleton, PButton, PCard, PInput, PPageHeader } from '@ui'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { tenantNotificationApi } from '@api/tenant/notification'
import { tenantUserManagementApi } from '@api/tenant/tenantUserManagement'
import { tenantSubscriptionAPI } from '@api/tenant/subscription'
import { tenantApi } from '@api/tenant/tenant'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'

interface TenantStats {
  appsTotal: number
  appsActive: number
  usersTotal: number
  usersActive: number
  notificationsTotal: number
  notificationsUnread: number
  subscriptionsTotal: number
  subscriptionsActive: number
}

interface QuickAction {
  id: string
  nameKey: string
  descriptionKey: string
  href: string
  icon: React.ComponentType<any>
  color: string
  requiresMarket?: boolean
}

const quickActionCardClass =
  'group flex items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50'

const quickActions: QuickAction[] = [
  {
    id: 'apps',
    nameKey: 'tenantDashboardPage.quickActions.apps.name',
    descriptionKey: 'tenantDashboardPage.quickActions.apps.description',
    href: '/tenant/apps',
    icon: CubeIcon,
    color: 'bg-blue-500'
  },
  {
    id: 'users',
    nameKey: 'tenantDashboardPage.quickActions.users.name',
    descriptionKey: 'tenantDashboardPage.quickActions.users.description',
    href: '/tenant/users',
    icon: UsersIcon,
    color: 'bg-indigo-500'
  },
  {
    id: 'roles',
    nameKey: 'tenantDashboardPage.quickActions.roles.name',
    descriptionKey: 'tenantDashboardPage.quickActions.roles.description',
    href: '/tenant/roles',
    icon: ShieldCheckIcon,
    color: 'bg-green-500'
  },
  {
    id: 'subscriptions',
    nameKey: 'tenantDashboardPage.quickActions.subscriptions.name',
    descriptionKey: 'tenantDashboardPage.quickActions.subscriptions.description',
    href: '/tenant/subscriptions',
    icon: ChartBarIcon,
    color: 'bg-indigo-500',
    requiresMarket: true
  },
  {
    id: 'products',
    nameKey: 'tenantDashboardPage.quickActions.products.name',
    descriptionKey: 'tenantDashboardPage.quickActions.products.description',
    href: '/tenant/subscriptions/products',
    icon: ServerIcon,
    color: 'bg-yellow-500',
    requiresMarket: true
  },
  {
    id: 'coupons',
    nameKey: 'tenantDashboardPage.quickActions.coupons.name',
    descriptionKey: 'tenantDashboardPage.quickActions.coupons.description',
    href: '/tenant/subscriptions/coupons',
    icon: CreditCardIcon,
    color: 'bg-red-500',
    requiresMarket: true
  }
]

export default function TenantDashboard() {
  const { t, locale } = useI18n()
  const { marketEnabled } = useConfig()
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantCode, setTenantCode] = useState<string>('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isCheckingLiveness, setIsCheckingLiveness] = useState(false)
  const [livenessTip, setLivenessTip] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, userStatsRes, notifStatsRes, subStatsRes, tenantInfoRes] = await Promise.all([
          tenantAppApi.listTenantApps(),
          tenantUserManagementApi.getTenantUserStats(),
          tenantNotificationApi.getNotificationStats(),
          tenantSubscriptionAPI.adminGetSubscriptionStats(),
          tenantApi.getTenantInfo(),
        ])

        const apps = (appsRes as any)?.data?.apps || []
        const appsActive = apps.filter((a: any) => a.status === 'active').length

        const userStats = (userStatsRes as any)?.stats || (userStatsRes as any)?.data?.stats || (userStatsRes as any)
        const usersTotal = Number((userStats as any)?.total_users ?? 0)
        const usersActive = Number((userStats as any)?.active_users ?? 0)

        const notifStats = (notifStatsRes as any)?.data?.data || (notifStatsRes as any)?.data
        const notificationsTotal = Number((notifStats as any)?.total_sent ?? 0)
        const notificationsUnread = Number((notifStats as any)?.total_unread ?? 0)

        const subStats = subStatsRes as any
        const subscriptionsTotal = Number(subStats?.total_subscriptions ?? 0)
        const subscriptionsActive = Number(subStats?.active_subscriptions ?? 0)

        setStats({
          appsTotal: apps.length,
          appsActive,
          usersTotal,
          usersActive,
          notificationsTotal,
          notificationsUnread,
          subscriptionsTotal,
          subscriptionsActive,
        })

        // code
        if (tenantInfoRes?.data?.code) {
          setTenantCode(tenantInfoRes.data.code)
        }
      } catch (err) {
        console.error(t('tenantDashboardPage.logs.fetchDataFailed'), err);
        setError(t('tenantDashboardPage.errors.loadDataFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  const getLoginUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || window.location.origin
    return `${baseUrl}/auth/tenant/${tenantCode}/login`
  }

  const getRegisterUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || window.location.origin
    return `${baseUrl}/auth/tenant/${tenantCode}/register`
  }

  const getJoinUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || window.location.origin
    return `${baseUrl}/auth/tenant/${tenantCode}/register`
  }

  const handleLivenessCheck = async () => {
    try {
      setIsCheckingLiveness(true)
      const response = await tenantApi.triggerLivenessCheck()
      const checkedAt = response?.checked_at ? new Date(response.checked_at).toLocaleString(locale) : ''
          setLivenessTip(checkedAt ? t('tenantDashboardPage.liveness.successWithTime', { time: checkedAt }) : t('tenantDashboardPage.liveness.success'))
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('tenantDashboardPage.liveness.failed')
      setLivenessTip(t('tenantDashboardPage.liveness.failedWithReason', { reason: msg }))
    } finally {
      setIsCheckingLiveness(false)
    }
  }

  const cards = useMemo(() => {
    if (!stats) return []
    const allCards = [
      {
        title: t('tenantDashboardPage.cards.apps.title'),
        value: stats.appsTotal,
        sub: t('tenantDashboardPage.cards.apps.active', { count: stats.appsActive }),
        icon: CubeIcon,
        href: '/tenant/apps',
        tone: 'text-blue-700 bg-blue-50',
      },
      {
        title: t('tenantDashboardPage.cards.users.title'),
        value: stats.usersTotal,
        sub: t('tenantDashboardPage.cards.users.active', { count: stats.usersActive }),
        icon: UsersIcon,
        href: '/tenant/users',
        tone: 'text-indigo-700 bg-indigo-50',
      },
      {
        title: t('tenantDashboardPage.cards.notifications.title'),
        value: stats.notificationsTotal,
        sub: t('tenantDashboardPage.cards.notifications.unread', { count: stats.notificationsUnread }),
        icon: BellIcon,
        href: '/tenant/notifications',
        tone: 'text-amber-700 bg-amber-50',
      },
      {
        title: t('tenantDashboardPage.cards.subscriptions.title'),
        value: stats.subscriptionsTotal,
        sub: t('tenantDashboardPage.cards.subscriptions.active', { count: stats.subscriptionsActive }),
        icon: ChartBarIcon,
        href: '/tenant/subscriptions/subscriptions',
        tone: 'text-indigo-700 bg-indigo-50',
        requiresMarket: true,
      },
    ]
    // 
    return allCards.filter(card => !card.requiresMarket || marketEnabled)
  }, [stats, marketEnabled, t])

  if (loading) {
    return (
      <TenantLayout title={t('tenantDashboardPage.layoutTitle')}>
        <PSkeleton.Dashboard statsCount={4} />
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantDashboardPage.layoutTitle')}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-red-600">{error}</div>
            <PButton onClick={() => window.location.reload()} className="mt-4">{t('tenantDashboardPage.actions.reload')}</PButton>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantDashboardPage.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantDashboardPage.title')}
          description={t('tenantDashboardPage.description')}
          actions={<PButton onClick={handleLivenessCheck} loading={isCheckingLiveness}>{t('tenantDashboardPage.actions.livenessCheck')}</PButton>}
        />
        {livenessTip && <p className="text-sm text-gray-600">{livenessTip}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.title} to={c.href} className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">{c.title}</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">{c.value}</div>
                  <div className="mt-1 text-xs text-gray-500">{c.sub}</div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tone}`}>
                  <c.icon className="h-6 w-6" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/*  */}
        {tenantCode && (
          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                <h2 className="text-base font-medium text-gray-900">{t('tenantDashboardPage.userAccessLinks.title')}</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">{t('tenantDashboardPage.userAccessLinks.description')}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/*  */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tenantDashboardPage.userAccessLinks.loginPage')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="w-full md:w-1/2 min-w-0">
                      <PInput
                        type="text"
                        readOnly
                        value={getLoginUrl()}
                        className="bg-gray-50 font-mono text-gray-600"
                      />
                    </div>
                    <PButton
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(getLoginUrl(), 'login')}
                      title={t('tenantDashboardPage.actions.copyLink')}
                    >
                      {copiedField === 'login' ? (
                        <CheckIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </PButton>
                  </div>
                </div>
                {/* 加入链接 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tenantDashboardPage.userAccessLinks.joinPage')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="w-full md:w-1/2 min-w-0">
                      <PInput
                        type="text"
                        readOnly
                        value={getJoinUrl()}
                        className="bg-gray-50 font-mono text-gray-600"
                      />
                    </div>
                    <PButton
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(getJoinUrl(), 'join')}
                      title={t('tenantDashboardPage.actions.copyLink')}
                    >
                      {copiedField === 'join' ? (
                        <CheckIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </PButton>
                  </div>
                </div>

                {/*  */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tenantDashboardPage.userAccessLinks.registerPage')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="w-full md:w-1/2 min-w-0">
                      <PInput
                        type="text"
                        readOnly
                        value={getRegisterUrl()}
                        className="bg-gray-50 font-mono text-gray-600"
                      />
                    </div>
                    <PButton
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(getRegisterUrl(), 'register')}
                      title={t('tenantDashboardPage.actions.copyLink')}
                    >
                      {copiedField === 'register' ? (
                        <CheckIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </PButton>
                  </div>
                </div>
              </div>

              {/*  */}
              <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p>{t('tenantDashboardPage.userAccessLinks.tip')}</p>
                  </div>
                </div>
              </div>
            </div>
          </PCard>
        )}

            <PCard className="rounded-xl p-0 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-medium text-gray-900">{t('tenantDashboardPage.quickActions.title')}</h2>
              </div>
              <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions
                  .filter(action => !action.requiresMarket || marketEnabled)
                  .map((action) => (
                  <Link
                    key={action.id}
                    to={action.href}
                    className={quickActionCardClass}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-gray-900">{t(action.nameKey)}</div>
                      <div className="mt-0.5 text-sm text-gray-500">{t(action.descriptionKey)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </PCard>
          </div>
    </TenantLayout>
  )
}
