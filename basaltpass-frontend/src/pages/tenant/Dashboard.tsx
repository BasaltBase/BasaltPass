import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  UsersIcon, 
  WalletIcon, 
  CubeIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ClockIcon,
  DocumentTextIcon,
  BellIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  ServerIcon,
  KeyIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '../../components/TenantLayout'

interface TenantStats {
  totalUsers: number
  activeUsers: number
  totalApps: number
  activeApps: number
  walletBalance: number
  monthlySpending: number
  totalServices: number
  activeServices: number
  lastUpdated: string
}

interface RecentActivity {
  id: string
  type: 'user' | 'app' | 'payment' | 'service'
  description: string
  user?: string
  amount?: number
  timestamp: string
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
    name: '用户管理',
    description: '管理租户下的用户',
    href: '/tenant/users',
    icon: UsersIcon,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    name: '应用管理',
    description: '管理应用和服务',
    href: '/tenant/apps',
    icon: CubeIcon,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    name: '钱包管理',
    description: '查看余额和充值',
    href: '/tenant/wallet',
    icon: WalletIcon,
    color: 'bg-yellow-500 hover:bg-yellow-600'
  },
  {
    name: '订阅管理',
    description: '管理订阅和套餐',
    href: '/tenant/subscriptions',
    icon: CreditCardIcon,
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    name: '服务监控',
    description: '监控服务状态',
    href: '/tenant/monitoring',
    icon: ChartBarIcon,
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  {
    name: 'API密钥',
    description: '管理API访问密钥',
    href: '/tenant/api-keys',
    icon: KeyIcon,
    color: 'bg-red-500 hover:bg-red-600'
  }
]

export default function TenantDashboard() {
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // 模拟获取租户统计数据
    const fetchData = async () => {
      try {
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 模拟数据
        const mockStats: TenantStats = {
          totalUsers: 156,
          activeUsers: 89,
          totalApps: 12,
          activeApps: 8,
          walletBalance: 2580.50,
          monthlySpending: 450.75,
          totalServices: 24,
          activeServices: 18,
          lastUpdated: new Date().toISOString()
        }

        const mockActivities: RecentActivity[] = [
          {
            id: '1',
            type: 'user',
            description: '新用户注册',
            user: 'user@example.com',
            timestamp: '2分钟前'
          },
          {
            id: '2',
            type: 'payment',
            description: '套餐续费成功',
            amount: 99.00,
            timestamp: '15分钟前'
          },
          {
            id: '3',
            type: 'app',
            description: '应用配置更新',
            user: 'admin@example.com',
            timestamp: '1小时前'
          },
          {
            id: '4',
            type: 'service',
            description: '服务实例重启',
            timestamp: '2小时前'
          }
        ]

        setStats(mockStats)
        setRecentActivities(mockActivities)
      } catch (err) {
        setError('加载数据失败')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <UsersIcon className="h-5 w-5 text-blue-500" />
      case 'payment':
        return <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
      case 'app':
        return <CubeIcon className="h-5 w-5 text-purple-500" />
      case 'service':
        return <ServerIcon className="h-5 w-5 text-orange-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <TenantLayout title="租户仪表板">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="租户仪表板">
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
    <TenantLayout title="租户仪表板">
      <div className="space-y-6">
        {/* 页面标题 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">租户仪表板</h1>
          <p className="mt-1 text-sm text-gray-500">
            欢迎来到租户控制台，管理您的应用、用户和服务
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总用户数</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats?.totalUsers}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">增长</span>
                        活跃: {stats?.activeUsers}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">应用数量</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats?.totalApps}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">增长</span>
                        运行: {stats?.activeApps}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WalletIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">钱包余额</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(stats?.walletBalance || 0)}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                        <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">下降</span>
                        本月: {formatCurrency(stats?.monthlySpending || 0)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">服务实例</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats?.totalServices}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">增长</span>
                        运行: {stats?.activeServices}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 快速操作 */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">快速操作</h3>
                <p className="mt-1 text-sm text-gray-500">常用的租户管理功能快捷入口</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {quickActions.map((action) => (
                    <Link
                      key={action.name}
                      to={action.href}
                      className="group relative bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
                    >
                      <div>
                        <span className={`inline-flex rounded-lg p-3 ${action.color} transition-colors duration-200`}>
                          <action.icon className="h-6 w-6 text-white" />
                        </span>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">
                          {action.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">{action.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 最近活动 */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近活动</h3>
                <p className="mt-1 text-sm text-gray-500">租户的最新动态</p>
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
                            金额: {formatCurrency(activity.amount)}
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
                    to="/tenant/logs"
                    className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                  >
                    查看所有活动 →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 租户状态 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">租户状态</h3>
            <p className="mt-1 text-sm text-gray-500">当前租户运行状态概览</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">正常</div>
                <div className="text-sm text-gray-500">服务状态</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">99.9%</div>
                <div className="text-sm text-gray-500">可用性</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">低</div>
                <div className="text-sm text-gray-500">资源使用率</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
