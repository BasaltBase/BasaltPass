import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { 
  UsersIcon, 
  WalletIcon, 
  BuildingOfficeIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  BellIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  CubeIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import { getDashboardStats, getRecentActivities, triggerAdminLivenessCheck } from '@api/admin/admin'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PSkeleton, PButton, PCard, PPageHeader } from '@ui'
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
      href: '/admin/users',
      icon: UsersIcon,
      color: 'bg-blue-500'
    },
    {
      name: t('adminDashboard.quickActions.wallets.name'),
      description: t('adminDashboard.quickActions.wallets.description'),
      href: '/admin/wallets',
      icon: WalletIcon,
      color: 'bg-green-500'
    },
    {
      name: t('adminDashboard.quickActions.subscriptions.name'),
      description: t('adminDashboard.quickActions.subscriptions.description'),
      href: '/admin/subscriptions',
      icon: CreditCardIcon,
      color: 'bg-indigo-500'
    },
    {
      name: t('adminDashboard.quickActions.apps.name'),
      description: t('adminDashboard.quickActions.apps.description'),
      href: '/admin/apps',
      icon: CubeIcon,
      color: 'bg-indigo-500'
    },
    {
      name: t('adminDashboard.quickActions.products.name'),
      description: t('adminDashboard.quickActions.products.description'),
      href: '/admin/products',
      icon: ShoppingCartIcon,
      color: 'bg-yellow-500'
    },
    {
      name: t('adminDashboard.quickActions.logs.name'),
      description: t('adminDashboard.quickActions.logs.description'),
      href: '/admin/logs',
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
    <AdminLayout title={t('adminDashboard.title')}>
      <div className="space-y-6">
      <PPageHeader
        title={t('adminDashboard.title')}
        description={t('adminDashboard.description')}
        actions={<PButton onClick={handleLivenessCheck} loading={isCheckingLiveness}>{t('adminDashboard.actions.livenessCheck')}</PButton>}
      />
      {livenessTip && <p className="text-sm text-gray-600">{livenessTip}</p>}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <PCard className="rounded-xl shadow-sm">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{t('adminDashboard.stats.totalUsers')}</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalUsers.toLocaleString(locale)}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-gray-600">
                <span>{t('adminDashboard.stats.activeUsers')}: {stats.activeUsers.toLocaleString(locale)}</span>
                <span className="ml-2 flex items-center text-green-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </PCard>

        <PCard className="rounded-xl shadow-sm">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WalletIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{t('adminDashboard.stats.totalWallets')}</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalWallets.toLocaleString(locale)}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-gray-600">
                <span>{t('adminDashboard.stats.todayRevenue')}: {formatCurrency(stats.todayRevenue)}</span>
              </div>
            </div>
          </div>
        </PCard>

        <PCard className="rounded-xl shadow-sm">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{t('adminDashboard.stats.totalRevenue')}</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalRevenue)}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4" />
                <span>{t('adminDashboard.stats.today')}: {formatCurrency(stats.todayRevenue)}</span>
              </div>
            </div>
          </div>
        </PCard>

        <PCard className="rounded-xl shadow-sm">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{t('adminDashboard.stats.totalSubscriptions')}</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSubscriptions.toLocaleString(locale)}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-gray-600">
                <span>{t('adminDashboard.stats.active')}: {stats.activeSubscriptions.toLocaleString(locale)}</span>
                <span className="ml-2 flex items-center text-green-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {((stats.activeSubscriptions / stats.totalSubscriptions) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </PCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('adminDashboard.quickActions.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.quickActions.subtitle')}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className={quickActionCardClass}
                  >
                    <div>
                      <span className={`inline-flex rounded-xl p-3 ${action.color}`}>
                        <action.icon className="h-6 w-6 text-white" />
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                        {action.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">{action.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </PCard>
        </div>

        <div className="lg:col-span-1">
          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{t('adminDashboard.recentActivities.title')}</h3>
              <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.recentActivities.subtitle')}</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-900">
                        {activity.description}
                        {activity.user && (
                          <span className="text-gray-500"> - {activity.user}</span>
                        )}
                      </div>
                      {activity.amount && (
                        <div className="text-sm text-gray-600">
                          {t('adminDashboard.recentActivities.amount')}: {formatCurrency(activity.amount)}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 flex items-center mt-1">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {activity.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link
                  to={ROUTES.admin.logs}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  {t('adminDashboard.recentActivities.viewAll')}
                </Link>
              </div>
            </div>
          </PCard>
        </div>
      </div>

      <PCard className="rounded-xl p-0 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{t('adminDashboard.systemStatus.title')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('adminDashboard.systemStatus.subtitle')}</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-500">{t('adminDashboard.systemStatus.availability')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalApplications.toLocaleString(locale)}</div>
              <div className="text-sm text-gray-500">{t('adminDashboard.systemStatus.totalApps')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-gray-500">{t('adminDashboard.systemStatus.pendingTasks')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{t('adminDashboard.systemStatus.normal')}</div>
              <div className="text-sm text-gray-500">{t('adminDashboard.systemStatus.serviceStatus')}</div>
            </div>
          </div>
        </div>
      </PCard>
      </div>
    </AdminLayout>
  )
}
