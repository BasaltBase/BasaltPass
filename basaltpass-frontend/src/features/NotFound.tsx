import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useI18n } from '@shared/i18n'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen bg-gray-100 relative flex items-center justify-center py-6 overflow-hidden">
      {/*  */}
      <div className="absolute -right-32 top-1/2 transform -translate-y-1/2 opacity-10 pointer-events-none">
        <ExclamationTriangleIcon className="h-[32rem] w-[32rem] text-blue-400" />
      </div>
      
      {/*  */}
      <div className="max-w-xl text-left space-y-6 ml-2 z-10 relative">
        <ExclamationTriangleIcon className="h-20 w-20 text-blue-500 mb-4 animate-pulse" />
        <h1 className="text-9xl font-extrabold text-gray-900 mb-2">404</h1>
        <p className="text-3xl text-gray-700 mb-6">{t('notFound.message')}</p>
        <Link to={ROUTES.user.dashboard} className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  )
}