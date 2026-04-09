import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

function Privacy() {
  const { t } = useI18n()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">{t('pages.privacy.title')}</h1>
        <p className="mt-4 text-sm text-gray-700 leading-6">
          {t('pages.privacy.descriptionPrimary')}
        </p>
        <p className="mt-3 text-sm text-gray-700 leading-6">
          {t('pages.privacy.descriptionSecondary')}
        </p>
        <div className="mt-6">
          <Link to={ROUTES.user.register} className="text-blue-600 hover:underline">
            {t('pages.privacy.backToRegister')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Privacy
