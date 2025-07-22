import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  Bars3Icon, 
  XMarkIcon,
  HomeIcon,
  UserIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  BellIcon,
  UserGroupIcon,
  WalletIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentTextIcon,
  KeyIcon,
  ArrowRightOnRectangleIcon,
  CreditCardIcon,
  CubeIcon,
  TagIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { clearAccessToken } from '../utils/auth'
import EnhancedNotificationIcon from './EnhancedNotificationIcon'

const navigation = [
  { name: '仪表板', href: '/dashboard', icon: HomeIcon },
  { name: '个人资料', href: '/profile', icon: UserIcon },
  { name: '团队', href: '/teams', icon: UserGroupIcon },
  { name: '钱包', href: '/wallet', icon: WalletIcon },
  { name: '我的订阅', href: '/subscriptions', icon: CreditCardIcon },
  { name: '产品与套餐', href: '/products', icon: CubeIcon },
  { name: '安全', href: '/security', icon: ShieldCheckIcon },
  { name: '设置', href: '/settings', icon: CogIcon },
  { name: '帮助', href: '/help', icon: QuestionMarkCircleIcon },
]

const adminNavigation = [
  { name: '用户管理', href: '/admin/users', icon: UsersIcon },
  { name: '角色管理', href: '/admin/roles', icon: KeyIcon },
  { name: '钱包管理', href: '/admin/wallets', icon: WalletIcon },
  { name: '订阅管理', href: '/admin/subscriptions', icon: CreditCardIcon },
  { name: '产品管理', href: '/admin/products', icon: CubeIcon },
  { name: '套餐管理', href: '/admin/plans', icon: TagIcon },
  { name: '定价管理', href: '/admin/prices', icon: CurrencyDollarIcon },
  { name: '优惠券管理', href: '/admin/coupons', icon: TagIcon },
  { name: '审计日志', href: '/admin/logs', icon: DocumentTextIcon },
  { name: '通知管理', href: '/admin/notifications', icon: BellIcon },
  { name: 'OAuth2客户端', href: '/admin/oauth-clients', icon: CogIcon },
]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAccessToken()
    navigate('/login')
  }

  const isActive = (href: string) => location.pathname === href

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* 移动端侧边栏 */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <h1 className="text-xl font-bold text-gray-900">BasaltPass</h1>
              </div>
              <nav className="mt-5 px-2 space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                  >
                    <item.icon className="text-gray-400 mr-4 h-6 w-6" />
                    {item.name}
                  </Link>
                ))}
                
                {/* 管理员菜单 */}
                <div className="pt-4">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    管理员
                  </h3>
                  <div className="mt-2 space-y-1">
                    {adminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${
                          isActive(item.href)
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-base font-medium rounded-md`}
                      >
                        <item.icon className="text-gray-400 mr-4 h-6 w-6" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* 桌面端侧边栏 */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-gray-900">BasaltPass</h1>
              </div>
              <nav className="mt-5 flex-1 px-2 bg-white space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isActive(item.href)
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    <item.icon className="text-gray-400 mr-3 h-6 w-6" />
                    {item.name}
                  </Link>
                ))}

                {/* 管理员菜单 */}
                <div className="pt-4">
                  <h3 className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    管理员
                  </h3>
                  <div className="mt-2 space-y-1">
                    {adminNavigation.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`${
                          isActive(item.href)
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                      >
                        <item.icon className="text-gray-400 mr-3 h-6 w-6" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* 顶部导航栏 */}
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        
        {/* 桌面端顶部栏 */}
        <div className="hidden md:flex md:items-center md:justify-end md:px-6 md:py-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <Link to="/notifications">
              <EnhancedNotificationIcon />
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-900 flex items-center"
              title="退出登录"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* 页面内容 */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 