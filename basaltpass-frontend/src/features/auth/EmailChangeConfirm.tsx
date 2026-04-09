import { useMemo, useState, useEffect } from 'react'
import client from '@api/client'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

function EmailChangeConfirm() {
  const { t } = useI18n()
  const token = useMemo(() => {
    const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(fragment)
    return params.get('token')
  }, [])
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmEmailChange = async () => {
      if (!token) {
        setStatus('error')
        setMessage(t('auth.emailChangeConfirm.messages.invalidLink'))
        return
      }

      try {
        const response = await client.post('/api/v1/security/email/confirm', { token })
        setStatus('success')
        setMessage(response.data.message || t('auth.emailChangeConfirm.messages.confirmed'))
      } catch (err: any) {
        setStatus('error')
        setMessage(err.response?.data?.error || t('auth.emailChangeConfirm.messages.confirmFailed'))
      }
    }

    confirmEmailChange()
  }, [token, t])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {t('auth.emailChangeConfirm.loading.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {t('auth.emailChangeConfirm.loading.description')}
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                {t('auth.emailChangeConfirm.success.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-8">
                <a
                  href={ROUTES.user.login}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {t('auth.emailChangeConfirm.actions.backToLogin')}
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
                {t('auth.emailChangeConfirm.error.title')}
              </h2>
              <p className="mt-2 text-center text-sm text-red-600">
                {message}
              </p>
              <div className="mt-8 space-y-4">
                <a
                  href={ROUTES.user.settings}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {t('auth.emailChangeConfirm.actions.backToSettings')}
                </a>
                <a
                  href={ROUTES.user.login}
                  className="w-full flex justify-center py-2 px-4 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {t('auth.emailChangeConfirm.actions.backToLogin')}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailChangeConfirm