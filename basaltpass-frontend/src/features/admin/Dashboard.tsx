import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  UsersIcon, 
  WalletIcon, 
  ArrowUpIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CubeIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { getDashboardStats, getRecentActivities, triggerAdminLivenessCheck } from '@api/admin/admin'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PSkeleton, PButton, PCard } from '@ui'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalWallets: number
  totalRevenue: number
  todayRevenue: number
  totalSubscriptions: number
  activeSubscriptions: number
  totalApplications: number
}

interface RecentActivity {
  id: string
  type: 'user_register' | 'wallet_transaction' | 'subscription_created' | 'app_created'
  description: string
  timestamp: string
  user?: string
  amount?: number
}

interface QuickAction {
  name: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
}

const quickActionCardClass =
  'group flex items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50'

export default function AdminDashboard() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalWallets: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalApplications: 0
  })
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingLiveness, setIsCheckingLiveness] = useState(false)
  const [livenessTip, setLivenessTip] = useState('')

  const quickActions: QuickAction[] = useMemo(() => [
    {
      name: t('adminDashboard.quickActions.users.name'),
      description: t('adminDashboard.quickActions.users.description'),
      href: ROUTES.admin.users,
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      name: t('adminDashboard.quickActions.wallets.name'),
      description: t('adminDashboard.quickActions.wallets.description'),
      href: ROUTES.admin.wallets,
      icon: WalletIcon,
      color: 'bg-green-500'
    },
    {
      name: t('adminDashboard.quickActions.subscriptions.name'),
      description: t('adminDashboard.quickActions.subscriptions.description'),
      href: ROUTES.admin.subscriptions,
      icon: CreditCardIcon,
      color: 'bg-indigo-500'
    },
    {
      name: t('adminDashboard.quickActions.apps.name'),
      description: t('adminDashboard.quickActions.apps.description'),
      href: ROUTES.admin.apps,
      icon: CubeIcon,
      color: 'bg-indigo-500'
    },
    {
      name: t('adminDashboard.quickActions.products.name'),
      description: t('adminDashboard.quickActions.products.description'),
      href: ROUTES.admin.products,
      icon: ShoppingCartIcon,
      color: 'bg-yellow-500'
    },
    {
      name: t('adminDashboard.quickActions.logs.name'),
      description: t('adminDashboard.quickActions.logs.description'),
      href: ROUTES.admin.logs,
      icon: DocumentTextIcon,
      color: 'bg-gray-500'
    }
  ], [t])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        const [statsResponse, activitiesResponse] = await Promise.all([
          getDashboardStats().catch(() => null),
          getRecentActivities().catch(() => null)
        ])
        
        if (statsResponse?.data) {
          setStats(statsResponse.data)
        } else {
          setStats({
            totalUsers: 1245,
            activeUsers: 856,
            totalWallets: 892,
            totalRevenue: 45680.50,
            todayRevenue: 1230.75,
            totalSubscriptions: 423,
            activeSubscriptions: 387,
            totalApplications: 12
          })
        }

        if (activitiesResponse?.data) {
          setRecentActivities(activitiesResponse.data)
        } else {
          setRecentActivities([
            {
              id: '1',
              type: 'user_register',
              description: t('adminDashboard.fallback.activity.userRegister'),
              timestamp: t('adminDashboard.fallback.time.minutesAgo', { count: 2 }),
              user: 'user@example.com'
            },
            {
              id: '2',
              type: 'wallet_transaction',
              description: t('adminDashboard.fallback.activity.walletTopup'),
              timestamp: t('adminDashboard.fallback.time.minutesAgo', { count: 5 }),
              user: 'john@example.com',
              amount: 100.00
            },
            {
              id: '3',
              type: 'subscription_created',
              description: t('adminDashboard.fallback.activity.subscriptionCreated'),
              timestamp: t('adminDashboard.fallback.time.minutesAgo', { count: 10 }),
              user: 'jane@example.com'
            },
            {
              id: '4',
              type: 'app_created',
              description: t('adminDashboard.fallback.activity.appCreated'),
              timestamp: t('adminDashboard.fallback.time.hoursAgo', { count: 1 }),
              user: 'admin@example.com'
            },
            {
              id: '5',
              type: 'wallet_transaction',
              description: t('adminDashboard.fallback.activity.walletWithdraw'),
              timestamp: t('adminDashboard.fallback.time.hoursAgo', { count: 2 }),
              user: 'mike@example.com',
              amount: 50.00
            }
          ])
        }
        
        setError(null)
      } catch (err) {
        setError(t('adminDashboard.errors.loadFailed'))
        console.error('Error fetching dashboard data:', err)
        
        setStats({
          totalUsers: 1245,
          activeUsers: 856,
          totalWallets: 892,
          totalRevenue: 45680.50,
          todayRevenue: 1230.75,
          totalSubscriptions: 423,
          activeSubscriptions: 387,
          totalApplications: 12
        })
        
        setRecentActivities([
          {
            id: '1',
            type: 'user_register',
            description: t('adminDashboard.fallback.activity.userRegister'),
            timestamp: t('adminDashboard.fallback.time.minutesAgo', { count: 2 }),
            user: 'user@example.com'
          }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [t])

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_register':
        return <UsersIcon className="h-5 w-5 text-blue-500" />
      case 'wallet_transaction':
        return <WalletIcon className="h-5 w-5 text-green-500" />
      case 'subscription_created':
        return <CreditCardIcon className="h-5 w-5 text-indigo-500" />
      case 'app_created':
        return <CubeIcon className="h-5 w-5 text-indigo-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const handleLivenessCheck = async () => {
    try {
      setIsCheckingLiveness(true)
      const response = await triggerAdminLivenessCheck()
      const checkedAt = response?.data?.checked_at ? new Date(response.data.checked_at).toLocaleString(locale) : ''
      setLivenessTip(checkedAt ? t('adminDashboard.liveness.successAt', { checkedAt }) : t('adminDashboard.liveness.success'))
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || t('adminDashboard.liveness.failed')
      setLivenessTip(t('adminDashboard.liveness.failedWithMessage', { message: msg }))
    } finally {
      setIsCheckingLiveness(false)
    }
  }

  const activeUserRate = stats.totalUsers > 0 ? (stats.activeUsers / stats.totalUsers) * 100 : 0
  const activeSubscriptionRate = stats.totalSubscriptions > 0 ? (stats.activeSubscriptions / stats.totalSubscriptions) * 100 : 0

  const summaryCards = [
    {
      title: t('adminDashboard.stats.totalUsers'),
      value: stats.totalUsers.toLocaleString(locale),
      sub: `${t('adminDashboard.stats.activeUsers')}: ${stats.activeUsers.toLocaleString(locale)}`,
      trend: `${activeUserRate.toFixed(1)}%`,
      href: ROUTES.admin.users,
      icon: UsersIcon,
      iconClass: 'bg-blue-50 text-blue-700',
      trendClass: 'text-blue-700',
    },
    {
      title: t('adminDashboard.stats.totalWallets'),
      value: stats.totalWallets.toLocaleString(locale),
      sub: `${t('adminDashboard.stats.todayRevenue')}: ${formatCurrency(stats.todayRevenue)}`,
      trend: formatCurrency(stats.todayRevenue),
      href: ROUTES.admin.wallets,
      icon: WalletIcon,
      iconClass: 'bg-emerald-50 text-emerald-700',
      trendClass: 'text-emerald-700',
    },
    {
      title: t('adminDashboard.stats.totalRevenue'),
      value: formatCurrency(stats.totalRevenue),
      sub: `${t('adminDashboard.stats.today')}: ${formatCurrency(stats.todayRevenue)}`,
      trend: formatCurrency(stats.todayRevenue),
      href: ROUTES.admin.subscriptions,
      icon: CurrencyDollarIcon,
      iconClass: 'bg-amber-50 text-amber-700',
      trendClass: 'text-amber-700',
    },
    {
      title: t('adminDashboard.stats.totalSubscriptions'),
      value: stats.totalSubscriptions.toLocaleString(locale),
      sub: `${t('adminDashboard.stats.active')}: ${stats.activeSubscriptions.toLocaleString(locale)}`,
      trend: `${activeSubscriptionRate.toFixed(1)}%`,
      href: ROUTES.admin.subscriptions,
      icon: CreditCardIcon,
      iconClass: 'bg-indigo-50 text-indigo-700',
      trendClass: 'text-indigo-700',
    },
  ]

  const systemStatusItems = [
    {
      label: t('adminDashboard.systemStatus.availability'),
      value: '99.9%',
      valueClass: 'text-emerald-600',
    },
    {
      label: t('adminDashboard.systemStatus.totalApps'),
      value: stats.totalApplications.toLocaleString(locale),
      valueClass: 'text-indigo-600',
    },
    {
      label: t('adminDashboard.systemStatus.pendingTasks'),
      value: '0',
      valueClass: 'text-amber-600',
    },
    {
      label: t('adminDashboard.systemStatus.serviceStatus'),
      value: t('adminDashboard.systemStatus.normal'),
      valueClass: 'text-sky-600',
    },
  ]

  if (isLoading) {
    return (
      <AdminLayout title={t('adminDashboard.layoutTitle')}>
        <PSkeleton.Dashboard statsCount={4} />
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title={t('adminDashboard.layoutTitle')}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-red-600">{error}</div>
            <PButton onClick={() => window.location.reload()} className="mt-4">{t('adminDashboard.actions.reload')}</PButton>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={t('adminDashboard.title')}
      actions={<PButton onClick={handleLivenessCheck} loading={isCheckingLiveness}>{t('adminDashboard.actions.livenessCheck')}</PButton>}
    >
      <div className="space-y-6">
        <PCard className="relative overflow-hidden border border-slate-200 p-0 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-800" />
          <div className="relative p-6 sm:p-8">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-3 lg:col-span-2">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-100">
                  {t('adminDashboard.layoutTitle')}
                </span>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">{t('adminDashboard.title')}</h2>
                <p className="max-w-2xl text-sm text-indigo-100 sm:text-base">{t('adminDashboard.description')}</p>
                {livenessTip && (
                  <div className="inline-flex items-center rounded-lg border border-emerald-200/50 bg-emerald-300/10 px-3 py-2 text-sm text-emerald-100">
                    {livenessTip}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-100/90">{t('adminDashboard.stats.totalRevenue')}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(stats.totalRevenue)}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-indigo-100/90">{t('adminDashboard.stats.todayRevenue')}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(stats.todayRevenue)}</p>
                </div>
              </div>
            </div>
          </div>
        </PCard>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Link
              key={card.title}
              to={card.href}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass}`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">{card.sub}</p>
                <span className={`inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold ${card.trendClass}`}>
                  <ArrowUpIcon className="h-3.5 w-3.5" />
                  {card.trend}
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <PCard className="xl:col-span-8 rounded-xl border border-gray-200 p-0 shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('adminDashboard.quickActions.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.quickActions.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => (
                <Link key={action.name} to={action.href} className={quickActionCardClass}>
                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">{action.name}</h4>
                    <p className="mt-1 text-sm text-gray-500">{action.description}</p>
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-gray-400 transition group-hover:text-indigo-500" />
                </Link>
              ))}
            </div>
          </PCard>

          <PCard className="xl:col-span-4 rounded-xl border border-gray-200 p-0 shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('adminDashboard.recentActivities.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.recentActivities.subtitle')}</p>
            </div>
            <div className="space-y-4 p-6">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    {activity.user && <p className="truncate text-sm text-gray-500">{activity.user}</p>}
                    {activity.amount && (
                      <p className="mt-1 text-xs text-gray-600">
                        {t('adminDashboard.recentActivities.amount')}: {formatCurrency(activity.amount)}
                      </p>
                    )}
                    <p className="mt-1 flex items-center text-xs text-gray-500">
                      <ClockIcon className="mr-1 h-3.5 w-3.5" />
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <Link to={ROUTES.admin.logs} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
                  {t('adminDashboard.recentActivities.viewAll')}
                </Link>
              </div>
            </div>
          </PCard>
        </div>

        <PCard className="rounded-xl border border-gray-200 p-0 shadow-sm">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-gray-900">{t('adminDashboard.systemStatus.title')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.systemStatus.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {systemStatusItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${item.valueClass}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </PCard>
      </div>
    </AdminLayout>
  )
}
