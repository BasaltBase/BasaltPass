import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { userGiftCardApi } from '@api/user/giftCard'
import Layout from '@features/user/components/Layout'
import { ROUTES } from '@constants'
import { PPageHeader, PInput, PButton } from '@ui'
import { useI18n } from '@shared/i18n'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GiftIcon
} from '@heroicons/react/24/outline'

export default function RedeemGiftCard() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedCode = code.trim()

    if (!trimmedCode) {
      setError(t('pages.walletRedeem.errors.requiredCode'))
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await userGiftCardApi.redeem(trimmedCode)
      setSuccess(true)
      setTimeout(() => {
        navigate(ROUTES.user.wallet)
      }, 1800)
    } catch (e: any) {
      setError(e.response?.data?.error || t('pages.walletRedeem.errors.redeemFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('pages.walletRedeem.success.title')}</h2>
            <p className="text-gray-600">{t('pages.walletRedeem.success.redirecting')}</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <PPageHeader
          title={t('pages.walletRedeem.header.title')}
          description={t('pages.walletRedeem.header.description')}
          backTo={ROUTES.user.wallet}
        />

        <div className="rounded-xl bg-white shadow-sm">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center mb-4">
              <GiftIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">{t('pages.walletRedeem.form.title')}</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PInput
                id="gift-card-code"
                label={t('pages.walletRedeem.form.codeLabel')}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  if (error) setError('')
                }}
                placeholder={t('pages.walletRedeem.form.codePlaceholder')}
              />
              <PButton type="submit" loading={isLoading} disabled={!code.trim()}>
                {t('pages.walletRedeem.form.submit')}
              </PButton>
            </form>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
