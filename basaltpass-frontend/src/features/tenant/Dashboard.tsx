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
  name: string
  description: string
  href: string
  icon: React.ComponentType<any>
  color: string
  requiresMarket?: boolean
}

const quickActionCardClass =
  'group flex items-start gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50'

const quickActions: QuickAction[] = [
  {
    name: '应用管理',
    description: '管理您的应用',
    href: '/tenant/apps',
    icon: CubeIcon,
    color: 'bg-blue-500'
  },
  {
    name: '用户管理',
    description: '管理租户下的用户',
    href: '/tenant/users',
    icon: UsersIcon,
    color: 'bg-indigo-500'
  },
  {
    name: '权限管理',
    description: '管理用户权限和角色',
    href: '/tenant/roles',
    icon: ShieldCheckIcon,
    color: 'bg-green-500'
  },
  {
    name: '订阅概览',
    description: '查看订阅状态和收入',
    href: '/tenant/subscriptions',
    icon: ChartBarIcon,
    color: 'bg-indigo-500',
    requiresMarket: true
  },
  {
    name: '产品管理',
    description: '管理订阅产品',
    href: '/tenant/subscriptions/products',
    icon: ServerIcon,
    color: 'bg-yellow-500',
    requiresMarket: true
  },
  {
    name: '优惠券管理',
    description: '创建和管理优惠券',
    href: '/tenant/subscriptions/coupons',
    icon: CreditCardIcon,
    color: 'bg-red-500',
    requiresMarket: true
  }
]

export default function TenantDashboard() {
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

        // 获取租户code
        if (tenantInfoRes?.data?.code) {
          setTenantCode(tenantInfoRes.data.code)
        }
      } catch (err) {
        console.error('获取数据失败:', err);
        setError('加载数据失败');
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
      console.error('复制失败:', err)
    }
  }

  const getLoginUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || 'http://localhost:5101'
    return `${baseUrl}/auth/tenant/${tenantCode}/login`
  }

  const getRegisterUrl = () => {
    const baseUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || 'http://localhost:5101'
    return `${baseUrl}/auth/tenant/${tenantCode}/register`
  }

  const handleLivenessCheck = async () => {
    try {
      setIsCheckingLiveness(true)
      const response = await tenantApi.triggerLivenessCheck()
      const checkedAt = response?.checked_at ? new Date(response.checked_at).toLocaleString() : ''
      setLivenessTip(checkedAt ? `存活检查通过（${checkedAt}）` : '存活检查通过')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '存活检查失败'
      setLivenessTip(`存活检查失败：${msg}`)
    } finally {
      setIsCheckingLiveness(false)
    }
  }

  const cards = useMemo(() => {
    if (!stats) return []
    const allCards = [
      {
        title: '应用',
        value: stats.appsTotal,
        sub: `活跃 ${stats.appsActive}`,
        icon: CubeIcon,
        href: '/tenant/apps',
        tone: 'text-blue-700 bg-blue-50',
      },
      {
        title: '租户用户',
        value: stats.usersTotal,
        sub: `活跃 ${stats.usersActive}`,
        icon: UsersIcon,
        href: '/tenant/users',
        tone: 'text-indigo-700 bg-indigo-50',
      },
      {
        title: '通知',
        value: stats.notificationsTotal,
        sub: `未读 ${stats.notificationsUnread}`,
        icon: BellIcon,
        href: '/tenant/notifications',
        tone: 'text-amber-700 bg-amber-50',
      },
      {
        title: '订阅',
        value: stats.subscriptionsTotal,
        sub: `活跃 ${stats.subscriptionsActive}`,
        icon: ChartBarIcon,
        href: '/tenant/subscriptions/subscriptions',
        tone: 'text-indigo-700 bg-indigo-50',
        requiresMarket: true,
      },
    ]
    // 根据市场功能配置过滤卡片
    return allCards.filter(card => !card.requiresMarket || marketEnabled)
  }, [stats, marketEnabled])

  if (loading) {
    return (
      <TenantLayout title="仪表板">
        <PSkeleton.Dashboard statsCount={4} />
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="仪表板">
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium text-red-600">{error}</div>
            <PButton onClick={() => window.location.reload()} className="mt-4">重新加载</PButton>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title="仪表板">
      <div className="space-y-6">
        <PPageHeader
          title="租户仪表盘"
          description="关键指标与快捷入口"
          actions={<PButton onClick={handleLivenessCheck} loading={isCheckingLiveness}>存活检查</PButton>}
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

        {/* 用户访问链接 */}
        {tenantCode && (
          <PCard className="rounded-xl p-0 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <LinkIcon className="h-5 w-5 text-blue-500 mr-2" />
                <h2 className="text-base font-medium text-gray-900">用户访问链接</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">分享这些链接给您的用户进行登录或注册</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 登录链接 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    登录页面
                  </label>
                  <div className="flex items-center space-x-2">
                    <PInput
                      type="text"
                      readOnly
                      value={getLoginUrl()}
                      className="flex-1 bg-gray-50 font-mono text-gray-600"
                    />
                    <PButton
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(getLoginUrl(), 'login')}
                      title="复制链接"
                    >
                      {copiedField === 'login' ? (
                        <CheckIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-5 w-5" />
                      )}
                    </PButton>
                  </div>
                </div>

                {/* 注册链接 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    注册页面
                  </label>
                  <div className="flex items-center space-x-2">
                    <PInput
                      type="text"
                      readOnly
                      value={getRegisterUrl()}
                      className="flex-1 bg-gray-50 font-mono text-gray-600"
                    />
                    <PButton
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(getRegisterUrl(), 'register')}
                      title="复制链接"
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

              {/* 提示信息 */}
              <div className="mt-4 rounded-lg bg-blue-50 p-3">
                <div className="flex">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p>将这些链接分享给您的用户，他们可以通过这些链接直接访问您租户的登录和注册页面。</p>
                  </div>
                </div>
              </div>
            </div>
          </PCard>
        )}

            <PCard className="rounded-xl p-0 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-medium text-gray-900">快捷操作</h2>
              </div>
              <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions
                  .filter(action => !action.requiresMarket || marketEnabled)
                  .map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className={quickActionCardClass}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.color}`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-gray-900">{action.name}</div>
                      <div className="mt-0.5 text-sm text-gray-500">{action.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </PCard>
          </div>
    </TenantLayout>
  )
}
