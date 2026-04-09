import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Layout from '@features/user/components/Layout'
import { PCard } from '@ui'
import { ROUTES } from '@constants'
import { buildInfo } from '@shared/generated/buildInfo'
import { useI18n } from '@shared/i18n'

const SoftwareCopyright: React.FC = () => {
  const currentYear = new Date().getFullYear()
  const { t } = useI18n()

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Link to={ROUTES.user.dashboard} className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          {t('pages.softwareCopyright.back')}
        </Link>

        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-gray-900">{t('pages.softwareCopyright.title')}</h1>
          <p className="mx-auto max-w-2xl text-sm text-gray-500">
            {t('pages.softwareCopyright.description')}
          </p>
        </div>

        <PCard>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{t('pages.softwareCopyright.fields.softwareName')}</p>
              <p className="text-lg font-semibold text-gray-900">BasaltPass</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{t('pages.softwareCopyright.fields.brand')}</p>
              <p className="text-lg font-semibold text-gray-900">BasaltBase</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{t('pages.softwareCopyright.fields.currentVersion')}</p>
              <p className="text-lg font-semibold text-gray-900">{buildInfo.version}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{t('pages.softwareCopyright.fields.buildCommit')}</p>
              <p className="text-lg font-semibold text-gray-900">{buildInfo.commit}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{t('pages.softwareCopyright.fields.buildTime')}</p>
              <p className="text-lg font-semibold text-gray-900">{new Date(buildInfo.generatedAt).toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{t('pages.softwareCopyright.fields.copyright')}</p>
              <p className="text-lg font-semibold text-gray-900">
                Copyright {buildInfo.copyrightStartYear} - {currentYear}
              </p>
            </div>
          </div>
        </PCard>

        <PCard>
          <div className="space-y-3 text-sm text-gray-600">
            <p>{t('pages.softwareCopyright.poweredByPrefix', { startYear: buildInfo.copyrightStartYear, currentYear })} <a href="https://hollowdata.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">HollowData</a></p>
            <p>{t('pages.softwareCopyright.versionRule')}</p>
          </div>
        </PCard>
      </div>
    </Layout>
  )
}

export default SoftwareCopyright
