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
} from '@heroicons/react/24/outline'
import TenantLayout from '../../components/TenantLayout'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { tenantNotificationApi } from '@api/tenant/notification'
import { tenantUserManagementApi } from '@api/tenant/tenantUserManagement'
import { tenantSubscriptionAPI } from '@api/tenant/subscription'

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
}

const quickActions: QuickAction[] = [
  {
    name: '应用管理',
    description: '管理您的应用',
    href: '/tenant/apps',
    icon: CubeIcon,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    name: '用户管理',
    description: '管理租户下的用户',
    href: '/tenant/users',
    icon: UsersIcon,
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  {
    name: '权限管理',
    description: '管理用户权限和角色',
    href: '/tenant/roles',
    icon: ShieldCheckIcon,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    name: '订阅概览',
    description: '查看订阅状态和收入',
    href: '/tenant/subscriptions',
    icon: ChartBarIcon,
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    name: '产品管理',
    description: '管理订阅产品',
    href: '/tenant/subscriptions/products',
    icon: ServerIcon,
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    name: '优惠券管理',
    description: '创建和管理优惠券',
    href: '/tenant/subscriptions/coupons',
    icon: CreditCardIcon,
    color: 'bg-red-500 hover:bg-red-600'
  }
]

export default function TenantDashboard() {
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, userStatsRes, notifStatsRes, subStatsRes] = await Promise.all([
          tenantAppApi.listTenantApps(),
          tenantUserManagementApi.getTenantUserStats(),
          tenantNotificationApi.getNotificationStats(),
          tenantSubscriptionAPI.adminGetSubscriptionStats(),
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
      } catch (err) {
        console.error('获取数据失败:', err);
        setError('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const cards = useMemo(() => {
    if (!stats) return []
    return [
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
        tone: 'text-purple-700 bg-purple-50',
      },
    ]
  }, [stats])

  if (loading) {
    return (
      <TenantLayout title="仪表板">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="仪表板">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium">{error}</div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              重新加载
            </button>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title="仪表板">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">租户仪表盘</h1>
            <p className="mt-1 text-sm text-gray-500">关键指标与快捷入口</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.title} to={c.href} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">{c.title}</div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">{c.value}</div>
                  <div className="mt-1 text-xs text-gray-500">{c.sub}</div>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${c.tone}`}>
                  <c.icon className="h-6 w-6" />
                </div>
              </div>
            </Link>
          ))}
        </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-medium text-gray-900">快捷操作</h2>
              </div>
              <div className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.name}
                    to={action.href}
                    className="group flex items-start gap-3 rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:bg-gray-50"
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${action.color}`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-gray-900">{action.name}</div>
                      <div className="mt-0.5 text-sm text-gray-500">{action.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
    </TenantLayout>
  )
}
