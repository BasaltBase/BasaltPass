import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PSkeleton, PCard, PButton, PAlert, PPageHeader, PBadge } from '@ui'
import { history as getWalletHistory } from '@api/user/wallet'
import { getSecurityStatus, SecurityStatus } from '@api/user/security'
import { getProfile, UserBasicProfile } from '@api/user/profile'
import { ROUTES } from '@constants'
import { useConfig } from '@contexts/ConfigContext'
import { useI18n } from '@shared/i18n'
import {
  WalletIcon, 
  UserIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  CogIcon,
  BellIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline'

const quickActionCardClass =
  'relative flex items-center space-x-3 rounded-xl border border-gray-300 bg-white px-6 py-5 shadow-sm transition hover:border-gray-400 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'

const quickActionDisabledClass =
  'relative flex items-center space-x-3 rounded-xl border border-gray-200 bg-gray-50 px-6 py-5 shadow-sm opacity-60 grayscale cursor-not-allowed'

interface RecentTransaction {
  id: string
  type: 'recharge' | 'withdraw'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  date: string
  description: string
}

interface WalletHistoryItem {
  ID?: number
  Type?: 'recharge' | 'withdraw'
  Amount?: number
  Status?: 'pending' | 'success' | 'fail'
  Reference?: string
  CreatedAt?: string
}

export default function Dashboard() {
  const { marketEnabled, walletRechargeWithdrawEnabled } = useConfig()
  const { t, locale } = useI18n()
  const [userProfile, setUserProfile] = useState<UserBasicProfile | null>(null)
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // 、
        const [profileResponse, securityResponse, historyResponse] = await Promise.all([
          getProfile(),
          getSecurityStatus(),
          getWalletHistory(undefined, 3) // 3（）
        ])

        setUserProfile(profileResponse.data)
        setSecurityStatus(securityResponse.data)
        
        const historyItems = Array.isArray(historyResponse.data)
          ? historyResponse.data
          : Array.isArray(historyResponse.data?.transactions)
            ? historyResponse.data.transactions
            : []

        setRecentTransactions(
          historyItems.map((transaction: WalletHistoryItem) => ({
            id: String(transaction.ID ?? crypto.randomUUID()),
            type: transaction.Type === 'withdraw' ? 'withdraw' : 'recharge',
            amount: Math.abs(Number(transaction.Amount ?? 0)),
            status:
              transaction.Status === 'success'
                ? 'completed'
                : transaction.Status === 'fail'
                  ? 'failed'
                  : 'pending',
            date: transaction.CreatedAt ?? new Date().toISOString(),
            description:
              transaction.Reference?.trim()
                ? transaction.Reference
                : transaction.Type === 'withdraw'
                  ? t('pages.dashboard.recentTransactions.withdrawFallback')
                  : t('pages.dashboard.recentTransactions.rechargeFallback'),
          }))
        )
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
        setError(t('pages.dashboard.errors.loadFailedMessage'))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // 
  const getSecurityLevel = () => {
    if (!securityStatus) {
      return {
        level: t('pages.dashboard.securityLevels.unknown'),
        description: t('pages.dashboard.securityLevels.loading'),
      }
    }
    
    let score = 0
    if (securityStatus.password_set) score += 1
    if (securityStatus.two_fa_enabled) score += 2
    if (securityStatus.passkeys_count > 0) score += 2
    if (securityStatus.email_verified) score += 1
    if (securityStatus.phone_verified) score += 1

    if (score >= 5) {
      return {
        level: t('pages.dashboard.securityLevels.high'),
        description: t('pages.dashboard.securityLevels.highDescription'),
      }
    }
    if (score >= 3) {
      return {
        level: t('pages.dashboard.securityLevels.medium'),
        description: t('pages.dashboard.securityLevels.mediumDescription'),
      }
    }
    return {
      level: t('pages.dashboard.securityLevels.low'),
      description: t('pages.dashboard.securityLevels.lowDescription'),
    }
  }

  const securityLevel = getSecurityLevel()

  const stats = [
    {
      id: 'accountStatus',
      name: t('pages.dashboard.stats.accountStatus'),
      value: userProfile?.banned
        ? t('pages.dashboard.stats.accountStatusBanned')
        : t('pages.dashboard.stats.accountStatusNormal'),
      icon: UserIcon,
      change: userProfile?.banned
        ? t('pages.dashboard.stats.accountStatusBannedHint')
        : t('pages.dashboard.stats.accountStatusNormalHint'),
      changeType: userProfile?.banned ? ('negative' as const) : ('positive' as const),
    },
    {
      id: 'securityLevel',
      name: t('pages.dashboard.stats.securityLevel'),
      value: securityLevel.level,
      icon: ShieldCheckIcon,
      change: securityLevel.description,
      changeType: 'neutral' as const,
    },
  ]

  if (isLoading) {
    return (
      <Layout>
        <PSkeleton.Dashboard statsCount={4} />
      </Layout>
    )
  }

  if (error) {
      return (
        <Layout>
        <PAlert
          variant="error"
          title={t('pages.dashboard.errors.loadFailedTitle')}
          message={error}
          actions={<PButton type="button" onClick={() => window.location.reload()}>{t('pages.dashboard.errors.retry')}</PButton>}
        />
        </Layout>
      )
    }

  return (
    <Layout>
      <div className="space-y-6">
        {/*  */}
        <PPageHeader
          title={t('pages.dashboard.header.title')}
          description={t('pages.dashboard.header.description')}
        />

        {/*  */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {stats.map((item) => (
            <PCard
              key={item.name}
              variant="default"
              hoverable
            >
              <dt>
                <div className="absolute rounded-lg bg-blue-500 p-3">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">
                  {item.name}
                </p>
              </dt>
              <dd className="ml-16 flex items-baseline">
                <p className={`text-2xl font-semibold ${
                  item.id === 'accountStatus' && userProfile?.banned
                    ? 'text-red-600' 
                    : 'text-gray-900'
                }`}>{item.value}</p>
                {item.change && (
                  <p
                    className={`ml-2 flex items-baseline text-sm font-semibold ${
                      item.changeType === 'positive'
                        ? 'text-green-600'
                        : item.changeType === 'negative'
                        ? 'text-red-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {item.changeType === 'positive' && (
                      <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" />
                    )}
                    {item.changeType === 'negative' && (
                      <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center" />
                    )}
                    <span className="sr-only">
                      {item.changeType === 'positive'
                        ? t('pages.dashboard.srOnly.positive')
                        : item.changeType === 'negative'
                          ? t('pages.dashboard.srOnly.negative')
                          : t('pages.dashboard.srOnly.neutral')}
                    </span>
                    {item.change}
                  </p>
                )}
              </dd>
            </PCard>
          ))}
        </div>

        {/*  */}
        <PCard>
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            {t('pages.dashboard.quickActions.title')}
          </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
              {walletRechargeWithdrawEnabled ? (
                <Link
                  to={ROUTES.user.walletRecharge}
                  className={quickActionCardClass}
                >
                  <div className="flex-shrink-0">
                    <ArrowUpIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.recharge')}</p>
                    <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.rechargeDesc')}</p>
                  </div>
                </Link>
              ) : (
                <div
                  className={quickActionDisabledClass}
                  aria-disabled
                  title={t('pages.dashboard.quickActions.rechargeDisabledTitle')}
                >
                  <div className="flex-shrink-0">
                    <ArrowUpIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">{t('pages.dashboard.quickActions.recharge')}</p>
                    <p className="text-sm text-gray-400">{t('pages.dashboard.quickActions.rechargeDisabledDesc')}</p>
                  </div>
                </div>
              )}

              {walletRechargeWithdrawEnabled ? (
                <Link
                  to={ROUTES.user.walletWithdraw}
                  className={quickActionCardClass}
                >
                  <div className="flex-shrink-0">
                    <ArrowDownIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.withdraw')}</p>
                    <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.withdrawDesc')}</p>
                  </div>
                </Link>
              ) : (
                <div
                  className={quickActionDisabledClass}
                  aria-disabled
                  title={t('pages.dashboard.quickActions.withdrawDisabledTitle')}
                >
                  <div className="flex-shrink-0">
                    <ArrowDownIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500">{t('pages.dashboard.quickActions.withdraw')}</p>
                    <p className="text-sm text-gray-400">{t('pages.dashboard.quickActions.withdrawDisabledDesc')}</p>
                  </div>
                </div>
              )}

              <Link
                to={ROUTES.user.walletHistory}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.history')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.historyDesc')}</p>
                </div>
              </Link>

              <Link
                to={ROUTES.user.securityTwoFA}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-purple-600" />
                  
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.security')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.securityDesc')}</p>
                </div>
              </Link>

              <Link
                to={ROUTES.user.teams}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.teams')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.teamsDesc')}</p>
                </div>
              </Link>

              {marketEnabled && (
                <Link
                  to={ROUTES.user.subscriptions}
                  className={quickActionCardClass}
                >
                  <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.subscriptions')}</p>
                    <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.subscriptionsDesc')}</p>
                  </div>
                </Link>
              )}

              {marketEnabled && (
                <Link
                  to={ROUTES.user.orders}
                  className={quickActionCardClass}
                >
                  <div className="flex-shrink-0">
                    <ShoppingCartIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.orders')}</p>
                    <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.ordersDesc')}</p>
                  </div>
                </Link>
              )}

              <Link
                to={ROUTES.user.notifications}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <BellIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.notifications')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.notificationsDesc')}</p>
                </div>
              </Link>

              <Link
                to={ROUTES.user.profile}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.profile')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.profileDesc')}</p>
                </div>
              </Link>

              <Link
                to={ROUTES.user.settings}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <CogIcon className="h-6 w-6 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.settings')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.settingsDesc')}</p>
                </div>
              </Link>

              <Link
                to={ROUTES.user.help}
                className={quickActionCardClass}
              >
                <div className="flex-shrink-0">
                  <QuestionMarkCircleIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <p className="text-sm font-medium text-gray-900">{t('pages.dashboard.quickActions.help')}</p>
                  <p className="text-sm text-gray-500">{t('pages.dashboard.quickActions.helpDesc')}</p>
                </div>
              </Link>
            </div>
        </PCard>

        {/*  */}
        <PCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {t('pages.dashboard.recentTransactions.title')}
            </h3>
              <Link
                to={ROUTES.user.walletHistory}
                className="text-sm font-medium text-blue-600 hover:text-indigo-700"
              >
                {t('pages.dashboard.recentTransactions.viewAll')}
              </Link>
            </div>
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentTransactions.length === 0 ? (
                  <li className="py-6 text-sm text-gray-500">{t('pages.dashboard.recentTransactions.empty')}</li>
                ) : recentTransactions.map((transaction) => (
                  <li key={transaction.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'recharge' 
                            ? 'bg-green-100' 
                            : 'bg-red-100'
                        }`}>
                          {transaction.type === 'recharge' ? (
                            <ArrowUpIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowDownIcon className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.date).toLocaleDateString(locale)}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'recharge' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'recharge' ? '+' : '-'}¥{transaction.amount}
                        </p>
                        <PBadge variant={
                          transaction.status === 'completed' ? 'success' :
                          transaction.status === 'pending' ? 'warning' : 'error'
                        }>
                          {transaction.status === 'completed'
                            ? t('pages.dashboard.recentTransactions.status.completed')
                            : transaction.status === 'pending'
                              ? t('pages.dashboard.recentTransactions.status.pending')
                              : t('pages.dashboard.recentTransactions.status.failed')}
                        </PBadge>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
        </PCard>
      </div>
    </Layout>
  )
} 
