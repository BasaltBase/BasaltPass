import { useMemo, useState, useEffect } from 'react'
import client from '@api/client'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

function EmailChangeCancel() {
  const { t } = useI18n()
  const token = useMemo(() => {
    const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(fragment)
    return params.get('token')
  }, [])
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const cancelEmailChange = async () => {
      if (!token) {
        setStatus('error')
        setMessage(t('auth.emailChangeCancel.messages.invalidLink'))
        return
      }

      try {
        const response = await client.post('/api/v1/security/email/cancel', { token })
        setStatus('success')
        setMessage(response.data.message || t('auth.emailChangeCancel.messages.cancelled'))
      } catch (err: any) {
        setStatus('error')
        setMessage(err.response?.data?.error || t('auth.emailChangeCancel.messages.cancelFailed'))
      }
    }

    cancelEmailChange()
  }, [token, t])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-yellow-500 animate-pulse">
                <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {t('auth.emailChangeCancel.loading.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {t('auth.emailChangeCancel.loading.description')}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {t('auth.emailChangeCancel.success.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {t('auth.emailChangeCancel.success.cardTitle')}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>{t('auth.emailChangeCancel.success.cardDescription')}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <a
                  href={ROUTES.user.settings}
                  className="flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {t('auth.emailChangeCancel.actions.backToSettings')}
                </a>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {t('auth.emailChangeCancel.error.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-red-600">
                {message}
              </p>
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      {t('auth.emailChangeCancel.error.cardTitle')}
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{t('auth.emailChangeCancel.error.possibleReasons')}</p>
                      <ul className="mt-1 list-disc pl-5">
                        <li>{t('auth.emailChangeCancel.error.reasonExpired')}</li>
                        <li>{t('auth.emailChangeCancel.error.reasonAlreadyHandled')}</li>
                        <li>{t('auth.emailChangeCancel.error.reasonInvalidToken')}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <a
                  href={ROUTES.user.settings}
                  className="flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {t('auth.emailChangeCancel.actions.backToSettings')}
                </a>
                <a
                  href={ROUTES.user.login}
                  className="flex w-full justify-center rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  {t('auth.emailChangeCancel.actions.backToLogin')}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailChangeCancel
