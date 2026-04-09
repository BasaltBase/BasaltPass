import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

interface LoginShellProps {
  children: ReactNode
  siteInitial: string
  siteName: string
}

export function LoginShell({ children, siteInitial, siteName }: LoginShellProps) {
  const { t } = useI18n()

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
                <p className="text-xs text-gray-500">{t('auth.login.pageTitleAdmin')}</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{t('auth.shell.welcomeBack')}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('auth.shell.loginDescription')}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {t('auth.shell.noAccount')}{' '}
                <Link to={ROUTES.user.register} className="font-medium text-blue-600 hover:text-blue-500">
                  {t('auth.shell.createAccount')}
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
