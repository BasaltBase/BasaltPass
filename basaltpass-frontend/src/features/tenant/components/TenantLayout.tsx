import { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bars3Icon, ChevronDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline'
import { UserIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import TenantNavigation from './TenantNavigation'
import { useAuth } from '@contexts/AuthContext'
import { useConfig } from '@contexts/ConfigContext'
import EnhancedNotificationIcon from '@components/EnhancedNotificationIcon'
import ConsoleAccountSwitcherModal from '@components/ConsoleAccountSwitcherModal'
import { PButton } from '@ui'
import { authorizeConsole, joinConsoleUrl } from '@api/console'
import { ROUTES } from '@constants'

interface TenantLayoutProps {
  children: ReactNode
  title?: string
  actions?: ReactNode
}

export default function TenantLayout({ children, title, actions }: TenantLayoutProps) {
  const { user, logout, canAccessAdmin } = useAuth()
  const { siteName, siteInitial, setPageTitle } = useConfig()
  const location = useLocation()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)

  const handleLogout = () => {
    logout()
  }

  // 判断当前是否在tenant路径
  const isTenantPath = location.pathname.startsWith(ROUTES.tenant.root)
  const isAdminPath = location.pathname.startsWith(ROUTES.admin.root)

  useEffect(() => {
    setPageTitle(title ? `租户控制台 - ${title}` : '租户控制台')
  }, [setPageTitle, title])

  useEffect(() => {
    setIsUserMenuOpen(false)
    setSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isUserMenuOpen) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (userMenuRef.current?.contains(target)) return
      setIsUserMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isUserMenuOpen])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setIsUserMenuOpen(false)
      setSidebarOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const consoleUserUrl = (import.meta as any).env?.VITE_CONSOLE_USER_URL || ''
  const consoleTenantUrl = (import.meta as any).env?.VITE_CONSOLE_TENANT_URL || ''
  const consoleAdminUrl = (import.meta as any).env?.VITE_CONSOLE_ADMIN_URL || ''

  const switchToAdmin = async () => {
    const { code } = await authorizeConsole('admin')
    window.location.href = joinConsoleUrl(consoleAdminUrl, `admin/dashboard?code=${encodeURIComponent(code)}`)
  }

  const switchToUser = () => {
    window.location.href = joinConsoleUrl(consoleUserUrl, 'dashboard')
  }

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
      <header className="sticky top-0 bg-white shadow z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center">
              {/* 移动端汉堡菜单按钮 */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="mr-3 inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 lg:hidden"
              >
                <span className="sr-only">打开侧边栏</span>
                <Bars3Icon className="h-6 w-6" />
              </button>
              <Link to={ROUTES.tenant.dashboard} className="flex items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                  <span className="text-white font-bold text-lg">{siteInitial}</span>
                </div>
                <div className="ml-2 flex items-baseline">
                  <span className="text-xl font-bold text-gray-900">{siteName}</span>
                  <span className="ml-2 text-sm font-medium text-gray-500">租户控制台</span>
                </div>
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
              
              {/* 管理系统切换按钮 - 切换到管理员面板 */}
              {isTenantPath && canAccessAdmin && (
                <button
                  onClick={switchToAdmin}
                  className="relative rounded-lg bg-indigo-50 px-3 py-2 text-indigo-600 transition-colors duration-200 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  title="切换到管理员面板"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">管理员面板</span>
                  </div>
                </button>
              )}
              
              {/* 管理系统切换按钮 - 切换到用户面板 */}
              {isTenantPath && (
                <button
                  onClick={switchToUser}
                  className="relative rounded-lg bg-green-50 px-3 py-2 text-green-600 transition-colors duration-200 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  title="切换到用户面板"
                >
                  <div className="flex items-center space-x-2">
                    <ArrowsRightLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">用户面板</span>
                  </div>
                </button>
              )}
              
              {/* 通知：使用全局 NotificationProvider 的组件，跳转到租户通知页 */}
              <div ref={userMenuRef} className="relative">
                <span className="sr-only">查看通知</span>
                <EnhancedNotificationIcon viewAllPath={ROUTES.tenant.notifications} />
              </div>

              {/* 用户菜单 */}
              <div className="relative">
                <PButton
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center rounded-full bg-white p-1 text-sm focus:ring-blue-500 focus:ring-offset-2 hover:bg-gray-50"
                >
                  <span className="sr-only">打开用户菜单</span>
                  {user?.avatar_url ? (
                    <img 
                      className="h-8 w-8 rounded-full object-cover" 
                      src={user.avatar_url} 
                      alt={user.nickname || user.email}
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">{getUserInitial()}</span>
                    </div>
                  )}
                  <ChevronDownIcon className="ml-1 h-4 w-4 text-gray-500" />
                </PButton>

                {/* 用户下拉菜单 */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm text-gray-900 font-medium">
                        {user?.nickname || '租户用户'}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {user?.email}
                      </p>
                    </div>
                    
                    <a
                      href={joinConsoleUrl(consoleUserUrl, 'profile')}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <UserIcon className="mr-3 h-4 w-4" />
                      个人资料
                    </a>
                    
                    <a
                      href={joinConsoleUrl(consoleUserUrl, 'settings')}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="mr-3 h-4 w-4" />
                      租户设置
                    </a>
                    
                    <PButton
                      variant="ghost"
                      onClick={() => {
                        setShowAccountSwitcher(true)
                        setIsUserMenuOpen(false)
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 justify-start"
                    >
                      <ArrowsRightLeftIcon className="mr-3 h-4 w-4" />
                      切换账户
                    </PButton>
                    
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
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* 移动端侧边栏 */}
        {sidebarOpen && (
          <div className="fixed inset-0 !m-0 z-40 flex lg:hidden">
            <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <span className="sr-only">关闭侧边栏</span>
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-0 flex-1 overflow-y-auto pt-5 pb-4">
                <div className="flex flex-shrink-0 items-center px-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                    <span className="text-white font-bold text-lg">{siteInitial}</span>
                  </div>
                  <div className="ml-2 flex items-baseline">
                    <span className="text-xl font-bold text-gray-900">{siteName}</span>
                    <span className="ml-2 text-sm font-medium text-gray-500">租户控制台</span>
                  </div>
                </div>
                <nav className="mt-5 space-y-1 px-2">
                  <TenantNavigation />
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* 桌面端侧边栏 */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:pt-16">
          <div className="flex flex-1 flex-col overflow-y-auto bg-white border-r border-gray-200">
            <div className="flex flex-1 flex-col pt-5 pb-4">
              <div className="flex flex-1 flex-col px-3">
                <TenantNavigation />
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

      <ConsoleAccountSwitcherModal
        open={showAccountSwitcher}
        onClose={() => setShowAccountSwitcher(false)}
        currentScope="tenant"
        currentTenantId={Number(user?.tenant_id || 0)}
        currentUserId={Number(user?.id || 0)}
        consoleUserUrl={consoleUserUrl}
        consoleTenantUrl={consoleTenantUrl}
        consoleAdminUrl={consoleAdminUrl}
      />
    </div>
  )
}
