import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  ArrowsRightLeftIcon,
  CreditCardIcon,
  CubeIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { PButton } from './index'
import { useAuth } from '../contexts/AuthContext'
import EnhancedNotificationIcon from './EnhancedNotificationIcon'

const navigation = [
  { name: '仪表板', href: '/dashboard', icon: HomeIcon },
  { name: '个人资料', href: '/profile', icon: UserIcon },
  { name: '团队', href: '/teams', icon: UserGroupIcon },
  { name: '钱包', href: '/wallet', icon: WalletIcon },
  { name: '我的订阅', href: '/subscriptions', icon: CreditCardIcon },
  { name: '产品与套餐', href: '/products', icon: CubeIcon },
  { name: '我的应用', href: '/my-apps', icon: CubeIcon },
  { name: '安全', href: '/security', icon: ShieldCheckIcon },
  { name: '设置', href: '/settings', icon: CogIcon },
  { name: '帮助', href: '/help', icon: QuestionMarkCircleIcon },
  { name: '关于', href: '/about', icon: InformationCircleIcon },
]

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  const getUserInitial = () => {
    if (user?.nickname) return user.nickname.charAt(0).toUpperCase()
    if (user?.email) return user.email.charAt(0).toUpperCase()
    return 'U'
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
              <PButton
                variant="ghost"
                size="sm"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:ring-inset focus:ring-white text-white hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <XMarkIcon className="h-6 w-6" />
              </PButton>
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
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* 顶部导航栏 */}
        <div className="md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3">
          <PButton
            variant="ghost"
            size="md"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </PButton>
        </div>
        
        {/* 桌面端顶部栏 */}
        <div className="hidden md:flex md:items-center md:justify-end md:px-6 md:py-4 bg-white border-b border-gray-200">
          <div className="flex items-center space-x-4">
            {/* 管理系统切换按钮 - 只在admin页面显示 */}

              {/* 管理系统切换按钮 - 只在platform页面显示 */}
                <Link
                  to="/tenant/dashboard"
                  className="relative rounded-md bg-purple-50 px-3 py-2 text-purple-600 hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
                  title="切换到租户管理"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">租户管理</span>
                  </div>
                </Link>
              
            <EnhancedNotificationIcon viewAllPath="/notifications" />
            {/* 用户菜单 */}
            <div className="relative">
              <PButton
                variant="ghost"
                size="sm"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center rounded-full bg-white p-1 text-sm focus:ring-blue-500 focus:ring-offset-2 hover:bg-gray-50"
                title="打开用户菜单"
              >
                <span className="sr-only">打开用户菜单</span>
                {user?.avatar_url ? (
                  <img
                    className="h-8 w-8 rounded-full object-cover"
                    src={user.avatar_url}
                    alt={user?.nickname || user?.email || 'User'}
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-medium text-white">{getUserInitial()}</span>
                  </div>
                )}
                <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-500" />
              </PButton>

              {isUserMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-900 font-medium">{user?.nickname || '用户'}</p>
                    <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <UserIcon className="mr-3 h-4 w-4" />
                    个人资料
                  </Link>
                  <Link
                    to="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    <CogIcon className="mr-3 h-4 w-4" />
                    设置
                  </Link>
                  <div className="border-t border-gray-200"></div>
                  <PButton
                    variant="ghost"
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 justify-start"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                    登出
                  </PButton>
                </div>
              )}

              {isUserMenuOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
              )}
            </div>
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

  {/* 移除旧的确认退出对话框，登出入口移至用户菜单 */}
    </div>
  )
} 