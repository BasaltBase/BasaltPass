import { useState, useEffect } from 'react'
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
import { getDashboardStats, getRecentActivities } from '@api/admin/admin'
import AdminLayout from '../../components/AdminLayout'

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

const quickActions: QuickAction[] = [
  {
    name: '用户管理',
    description: '查看和管理系统用户',
    href: '/admin/users',
    icon: UsersIcon,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    name: '钱包管理',
    description: '查看用户钱包和交易',
    href: '/admin/wallets',
    icon: WalletIcon,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    name: '订阅管理',
    description: '管理用户订阅和计费',
    href: '/admin/subscriptions',
    icon: CreditCardIcon,
    color: 'bg-purple-500 hover:bg-purple-600'
  },
  {
    name: '应用管理',
    description: '管理租户应用配置',
    href: '/admin/apps',
    icon: CubeIcon,
    color: 'bg-indigo-500 hover:bg-indigo-600'
  },
  {
    name: '产品管理',
    description: '管理产品和套餐',
    href: '/admin/products',
    icon: ShoppingCartIcon,
    color: 'bg-orange-500 hover:bg-orange-600'
  },
  {
    name: '审计日志',
    description: '查看系统操作日志',
    href: '/admin/logs',
    icon: DocumentTextIcon,
    color: 'bg-gray-500 hover:bg-gray-600'
  }
]

export default function AdminDashboard() {
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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true)
        
        // 并行获取统计数据和最近活动
        const [statsResponse, activitiesResponse] = await Promise.all([
          getDashboardStats().catch(() => null),
          getRecentActivities().catch(() => null)
        ])
        
        // 处理统计数据
        if (statsResponse?.data) {
          setStats(statsResponse.data)
        } else {
          // 如果API调用失败，使用模拟数据
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

        // 处理最近活动数据
        if (activitiesResponse?.data) {
          setRecentActivities(activitiesResponse.data)
        } else {
          // 如果API调用失败，使用模拟数据
          setRecentActivities([
            {
              id: '1',
              type: 'user_register',
              description: '新用户注册',
              timestamp: '2分钟前',
              user: 'user@example.com'
            },
            {
              id: '2',
              type: 'wallet_transaction',
              description: '钱包充值',
              timestamp: '5分钟前',
              user: 'john@example.com',
              amount: 100.00
            },
            {
              id: '3',
              type: 'subscription_created',
              description: '新订阅创建',
              timestamp: '10分钟前',
              user: 'jane@example.com'
            },
            {
              id: '4',
              type: 'app_created',
              description: '新应用创建',
              timestamp: '1小时前',
              user: 'admin@example.com'
            },
            {
              id: '5',
              type: 'wallet_transaction',
              description: '钱包提现',
              timestamp: '2小时前',
              user: 'mike@example.com',
              amount: 50.00
            }
          ])
        }
        
        setError(null)
      } catch (err) {
        setError('加载仪表板数据失败')
        console.error('Error fetching dashboard data:', err)
        
        // 如果出现错误，使用模拟数据作为降级方案
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
            description: '新用户注册',
            timestamp: '2分钟前',
            user: 'user@example.com'
          }
        ])
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'user_register':
        return <UsersIcon className="h-5 w-5 text-blue-500" />
      case 'wallet_transaction':
        return <WalletIcon className="h-5 w-5 text-green-500" />
      case 'subscription_created':
        return <CreditCardIcon className="h-5 w-5 text-purple-500" />
      case 'app_created':
        return <CubeIcon className="h-5 w-5 text-indigo-500" />
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            重新加载
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout title="管理仪表板">
      <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理仪表板</h1>
        <p className="mt-1 text-sm text-gray-500">
          欢迎来到BasaltPass管理控制台，这里可以查看系统概览和执行管理操作
        </p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* 用户统计 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">总用户数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalUsers.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-gray-600">
                <span>活跃用户: {stats.activeUsers.toLocaleString()}</span>
                <span className="ml-2 flex items-center text-green-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 钱包统计 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WalletIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">钱包总数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalWallets.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-gray-600">
                <span>今日收入: {formatCurrency(stats.todayRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 收入统计 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">总收入</dt>
                  <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalRevenue)}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-green-600">
                <ArrowUpIcon className="h-4 w-4" />
                <span>今日: {formatCurrency(stats.todayRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 订阅统计 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CreditCardIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">订阅总数</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalSubscriptions.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-center text-sm text-gray-600">
                <span>活跃: {stats.activeSubscriptions.toLocaleString()}</span>
                <span className="ml-2 flex items-center text-green-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {((stats.activeSubscriptions / stats.totalSubscriptions) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快速操作 */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">快速操作</h3>
              <p className="mt-1 text-sm text-gray-500">常用的管理功能快捷入口</p>
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
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
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
              <p className="mt-1 text-sm text-gray-500">系统的最新动态</p>
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
                  to="/admin/logs"
                  className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  查看所有活动 →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 系统状态 */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">系统状态</h3>
          <p className="mt-1 text-sm text-gray-500">当前系统运行状态概览</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <div className="text-sm text-gray-500">系统可用性</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalApplications}</div>
              <div className="text-sm text-gray-500">应用总数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-gray-500">待处理任务</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">正常</div>
              <div className="text-sm text-gray-500">服务状态</div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
