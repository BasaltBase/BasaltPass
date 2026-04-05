import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'

interface LoginShellProps {
  children: ReactNode
  siteInitial: string
  siteName: string
}

export function LoginShell({ children, siteInitial, siteName }: LoginShellProps) {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                <span className="text-sm font-semibold text-white">{siteInitial}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{siteName}</p>
                <p className="text-xs text-gray-500">管理员登录</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">欢迎回来</h2>
              <p className="mt-2 text-sm text-gray-600">
                使用邮箱或手机号登录，继续访问您的账户。
              </p>
              <p className="mt-2 text-sm text-gray-600">
                还没有账户？{' '}
                <Link to={ROUTES.user.register} className="font-medium text-blue-600 hover:text-blue-500">
                  创建新账户
                </Link>
              </p>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
