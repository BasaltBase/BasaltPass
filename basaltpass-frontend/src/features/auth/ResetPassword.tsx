import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '@api/client'
import { PInput, PButton, PAlert } from '@ui'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

function ResetPassword() {
  const navigate = useNavigate()
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [step, setStep] = useState<'request' | 'reset'>(!token ? 'request' : 'reset')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      await client.post('/api/v1/security/password/reset', { email })
      setSuccess(t('auth.resetPassword.request.success'))
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.resetPassword.request.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setError(t('auth.resetPassword.reset.passwordMismatch'))
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await client.post('/api/v1/security/password/reset/confirm', {
        token,
        new_password: newPassword
      })
      setSuccess(t('auth.resetPassword.reset.success'))
      setTimeout(() => navigate(ROUTES.user.login), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.resetPassword.reset.failed'))
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'request') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {t('auth.resetPassword.request.title')}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {t('auth.resetPassword.request.description')}
            </p>
          </div>
          
          {success ? (
            <PAlert variant="success" message={success} />
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
              <div>
                <PInput
                  label={t('auth.resetPassword.request.emailLabel')}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder={t('auth.resetPassword.request.emailPlaceholder')}
                  required
                />
              </div>

              {error && <PAlert variant="error" message={error} />}

              <div>
                <PButton
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={isLoading}
                >
                  {t('auth.resetPassword.request.submit')}
                </PButton>
              </div>

              <div className="text-center">
                <PButton type="button" variant="ghost" onClick={() => navigate(ROUTES.user.login)}>
                  {t('auth.resetPassword.actions.backToLogin')}
                </PButton>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('auth.resetPassword.reset.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.resetPassword.reset.description')}
          </p>
        </div>

        {success ? (
          <PAlert variant="success" message={success} />
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <PInput
                label={t('auth.resetPassword.reset.newPasswordLabel')}
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder={t('auth.resetPassword.reset.newPasswordPlaceholder')}
                required
              />
            </div>

            <div>
              <PInput
                label={t('auth.resetPassword.reset.confirmPasswordLabel')}
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder={t('auth.resetPassword.reset.confirmPasswordPlaceholder')}
                required
              />
            </div>

            {error && <PAlert variant="error" message={error} />}

            <div>
              <PButton
                type="submit"
                variant="primary"
                fullWidth
                loading={isLoading}
              >
                {t('auth.resetPassword.reset.submit')}
              </PButton>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword