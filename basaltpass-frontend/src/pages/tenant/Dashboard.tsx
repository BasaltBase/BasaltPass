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
  KeyIcon,
  ShieldCheckIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '../../components/TenantLayout'
import { 
  listTenantProducts, 
  listTenantPlans, 
  listTenantSubscriptions, 
  listTenantCoupons 
} from '@api/tenant/subscription'

interface TenantStats {
  totalUsers: number
  activeUsers: number
  totalApps: number
  activeApps: number
  walletBalance: number
  monthlySpending: number
  totalServices: number
  activeServices: number
  // 订阅管理相关统计
  totalSubscriptions: number
  activeSubscriptions: number
  totalProducts: number
  totalPlans: number
  totalCoupons: number
  activeCoupons: number
  monthlyRevenue: number
  lastUpdated: string
}

interface RecentActivity {
  id: string
  type: 'user' | 'app' | 'payment' | 'service' | 'subscription' | 'coupon' | 'product'
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
    href: '/tenant/coupons',
    icon: CreditCardIcon,
    color: 'bg-red-500 hover:bg-red-600'
  }
]

export default function TenantDashboard() {
  const [stats, setStats] = useState<TenantStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // 判断优惠券是否过期
  const isExpired = (coupon: any) => {
    if (!coupon.ExpiresAt) return false;
    return new Date(coupon.ExpiresAt) < new Date();
  };

  useEffect(() => {
    // 获取真实的租户订阅数据
    const fetchData = async () => {
      try {
        // 并行获取所有数据
        const [productsRes, plansRes, subscriptionsRes, couponsRes] = await Promise.all([
          listTenantProducts({ page: 1, page_size: 1000 }).catch(() => ({ data: [] })),
          listTenantPlans({ page: 1, page_size: 1000 }).catch(() => ({ data: [] })),
          listTenantSubscriptions({ page: 1, page_size: 1000 }).catch(() => ({ data: [] })),
          listTenantCoupons({ page: 1, page_size: 1000 }).catch(() => ({ data: [] }))
        ]);

        // 计算统计数据
        const products = productsRes.data || [];
        const plans = plansRes.data || [];
        const subscriptions = subscriptionsRes.data || [];
        const coupons = couponsRes.data || [];

        // 如果API调用都失败了，使用模拟数据
        const hasRealData = products.length > 0 || plans.length > 0 || subscriptions.length > 0 || coupons.length > 0;

        const stats: TenantStats = {
          totalUsers: 156, // 保留模拟数据
          activeUsers: 89, // 保留模拟数据
          totalApps: 12, // 保留模拟数据
          activeApps: 8, // 保留模拟数据
          walletBalance: 2580.50, // 保留模拟数据
          monthlySpending: 450.75, // 保留模拟数据
          totalServices: 24, // 保留模拟数据
          activeServices: 18, // 保留模拟数据
          // 真实API数据，如果没有数据则使用模拟数据
          totalSubscriptions: subscriptions.length || (hasRealData ? 0 : 45),
          activeSubscriptions: subscriptions.filter((sub: any) => sub.Status === 'active').length || (hasRealData ? 0 : 38),
          totalProducts: products.length || (hasRealData ? 0 : 6),
          totalPlans: plans.length || (hasRealData ? 0 : 18),
          totalCoupons: coupons.length || (hasRealData ? 0 : 12),
          activeCoupons: coupons.filter((coupon: any) => coupon.IsActive && !isExpired(coupon)).length || (hasRealData ? 0 : 8),
          monthlyRevenue: 0, // 暂时用0，显示为--
          lastUpdated: new Date().toISOString()
        };

        const mockActivities: RecentActivity[] = [
          {
            id: '1',
            type: 'subscription',
            description: '新订阅创建 - 专业版套餐',
            user: 'user@example.com',
            amount: 299.00,
            timestamp: '5分钟前'
          },
          {
            id: '2',
            type: 'coupon',
            description: '优惠券 WELCOME10 被使用',
            user: 'newuser@example.com',
            timestamp: '12分钟前'
          },
          {
            id: '3',
            type: 'product',
            description: '产品 "企业版" 已创建',
            user: 'admin@example.com',
            timestamp: '25分钟前'
          },
          {
            id: '4',
            type: 'subscription',
            description: '订阅续费成功',
            amount: 99.00,
            timestamp: '1小时前'
          },
          {
            id: '5',
            type: 'user',
            description: '新用户注册',
            user: 'newbie@example.com',
            timestamp: '2小时前'
          }
        ];

        setStats(stats);
        setRecentActivities(mockActivities);
      } catch (err) {
        console.error('获取数据失败:', err);
        setError('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
      case 'subscription':
        return <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
      case 'app':
      case 'product':
        return <CubeIcon className="h-5 w-5 text-purple-500" />
      case 'service':
        return <ServerIcon className="h-5 w-5 text-orange-500" />
      case 'coupon':
        return <CreditCardIcon className="h-5 w-5 text-red-500" />
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
          <h1 className="text-2xl font-bold text-gray-900">订阅管理仪表板</h1>
          <p className="mt-1 text-sm text-gray-500">
            管理您的订阅产品、套餐、定价和用户订阅状态
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总订阅数</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats?.totalSubscriptions}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                        <span className="sr-only">增长</span>
                        活跃: {stats?.activeSubscriptions}
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
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">月收入</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats?.monthlyRevenue ? formatCurrency(stats.monthlyRevenue) : '--'}
                      </div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-gray-400">
                        <span className="sr-only">暂无数据</span>
                        {stats?.monthlyRevenue ? '+12.5%' : '暂无数据'}
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
                    <dt className="text-sm font-medium text-gray-500 truncate">产品套餐</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats?.totalProducts}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                        <span className="sr-only">套餐</span>
                        套餐: {stats?.totalPlans}
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
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">优惠券</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">{stats?.totalCoupons}</div>
                      <div className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
                        <span className="sr-only">活跃</span>
                        活跃: {stats?.activeCoupons}
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
