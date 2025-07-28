import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bars3Icon, BellIcon, ChevronDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import AdminNavigation from './AdminNavigation'
import { useAuth } from '../contexts/AuthContext'

interface AdminLayoutProps {
  children: ReactNode
  title?: string
  actions?: ReactNode
}

export default function AdminLayout({ children, title, actions }: AdminLayoutProps) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
  }

  // 判断当前是否在admin路径
  const isAdminPath = location.pathname.startsWith('/admin')
  const isPlatformPath = location.pathname.startsWith('/platform')

  const getUserInitial = () => {
    if (user?.nickname) {
      return user.nickname.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">BasaltPass</span>
              </Link>
              {title && (
                <>
                  <span className="mx-3 text-gray-400">/</span>
                  <h1 className="text-lg font-medium text-gray-900">{title}</h1>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {actions}
              
              {/* 管理系统切换按钮 - 只在admin页面显示 */}
              {isAdminPath && (
                <Link
                  to="/admin/tenants"
                  className="relative rounded-md bg-blue-50 px-3 py-2 text-blue-600 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                  title="切换到平台管理"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">平台管理</span>
                  </div>
                </Link>
              )}
              
              {/* 管理系统切换按钮 - 只在platform页面显示 */}
              {isPlatformPath && (
                <Link
                  to="/dashboard"
                  className="relative rounded-md bg-indigo-50 px-3 py-2 text-indigo-600 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors duration-200"
                  title="切换到租户管理"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">租户管理</span>
                  </div>
                </Link>
              )}
              
              {/* 通知 */}
              <Link
                to="/notifications"
                className="relative rounded-full bg-white p-1 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <span className="sr-only">查看通知</span>
                <BellIcon className="h-6 w-6" />
                {/* 通知徽章 */}
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                  3
                </span>
              </Link>

              {/* 用户菜单 */}
              <div className="relative">
                <button 
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center rounded-full bg-white p-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-gray-50"
                >
                  <span className="sr-only">打开用户菜单</span>
                  {user?.avatar_url ? (
                    <img 
                      className="h-8 w-8 rounded-full object-cover" 
                      src={user.avatar_url} 
                      alt={user.nickname || user.email}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{getUserInitial()}</span>
                    </div>
                  )}
                  <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-500" />
                </button>

                {/* 用户下拉菜单 */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-900 font-medium">
                        {user?.nickname || '用户'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <Link
                      to="/admin/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <UserIcon className="mr-3 h-4 w-4" />
                      个人资料
                    </Link>
                    
                    <Link
                      to="/admin/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="mr-3 h-4 w-4" />
                      设置
                    </Link>
                    
                    <div className="border-t border-gray-200"></div>
                    
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                      登出
                    </button>
                  </div>
                )}

                {/* 点击外部关闭菜单 */}
                {isUserMenuOpen && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 侧边栏 */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16">
          <div className="flex flex-1 flex-col overflow-y-auto bg-white border-r border-gray-200">
            <div className="flex flex-1 flex-col pt-5 pb-4">
              <div className="flex flex-1 flex-col px-3">
                <AdminNavigation />
              </div>
            </div>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="lg:ml-64 flex-1">
          <main className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* 移动端菜单 */}
      <div className="lg:hidden">
        <div className="fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                <span className="sr-only">关闭侧边栏</span>
                <Bars3Icon className="h-6 w-6 text-white" />
              </button>
            </div>
            <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
              <div className="flex flex-shrink-0 items-center px-4">
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">B</span>
                </div>
                <span className="ml-2 text-xl font-bold text-gray-900">BasaltPass</span>
              </div>
              <nav className="mt-5 space-y-1 px-2">
                <AdminNavigation />
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
