import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@constants'
import client from '@api/client'
import { useConfig } from '@contexts/ConfigContext'
import { PInput, PButton, PCheckbox, PAlert } from '@ui'
import { useI18n } from '@shared/i18n'

const getPasswordStrength = (value: string, t: (key: string) => string) => {
  if (!value) return { label: t('auth.register.passwordStrength.notSet'), color: 'bg-gray-200', percent: 0 }

  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score <= 1) return { label: t('auth.register.passwordStrength.weak'), color: 'bg-red-500', percent: 25 }
  if (score === 2) return { label: t('auth.register.passwordStrength.medium'), color: 'bg-yellow-500', percent: 50 }
  if (score === 3) return { label: t('auth.register.passwordStrength.good'), color: 'bg-blue-500', percent: 75 }
  return { label: t('auth.register.passwordStrength.strong'), color: 'bg-green-500', percent: 100 }
}

function Register() {
  const navigate = useNavigate()
  const { siteName, siteInitial, setPageTitle } = useConfig()
  const { t } = useI18n()
  const [step, setStep] = useState<'form' | 'verification' | 'complete'>('form')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [signupId, setSignupId] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const usernamePreview = email.includes('@') ? email.split('@')[0] : email
  const passwordStrength = getPasswordStrength(password, t)
  const isPasswordTooShort = password.length < 8

  useEffect(() => {
    setPageTitle(t('auth.register.pageTitle'))
  }, [setPageTitle, t])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isPasswordTooShort) {
      setError(t('auth.register.errors.passwordMinLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.register.errors.passwordMismatch'))
      return
    }

    if (!agreeTerms) {
      setError(t('auth.register.errors.agreeTermsRequired'))
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const startResponse = await client.post('/api/v1/signup/start', {
        email,
        phone,
        username: email.split('@')[0],
        password,
      })

      setSignupId(startResponse.data.signup_id)

      await client.post('/api/v1/signup/send_email_code', {
        signup_id: startResponse.data.signup_id,
      })

      setStep('verification')
      startResendCooldown()
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.register.errors.registerFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode) {
      setError(t('auth.register.errors.verificationCodeRequired'))
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      await client.post('/api/v1/signup/verify_email_code', {
        signup_id: signupId,
        code: verificationCode,
      })

      await client.post('/api/v1/signup/complete', {
        signup_id: signupId,
      })

      setStep('complete')
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.register.errors.verifyCodeFailed'))
    } finally {
      setIsVerifying(false)
    }
  }

  const resendCode = async () => {
    if (resendCooldown > 0) return

    setIsSendingCode(true)
    setError('')

    try {
      await client.post('/api/v1/signup/resend_email_code', {
        signup_id: signupId,
      })
      startResendCooldown()
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.register.errors.resendCodeFailed'))
    } finally {
      setIsSendingCode(false)
    }
  }

  const startResendCooldown = () => {
    setResendCooldown(60)
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const renderShell = (subtitle: string, title: string, description: ReactNode, content: ReactNode) => (
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
                <p className="text-xs text-gray-500">{subtitle}</p>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
              <div className="mt-2 text-sm text-gray-600">{description}</div>
            </div>
          </div>

          {content}
        </div>
      </div>
    </div>
  )

  if (step === 'complete') {
    return renderShell(
      t('auth.register.complete.subtitle'),
      t('auth.register.complete.title'),
      <>{t('auth.register.complete.description')}</>,
      <div className="mt-6">
        <PButton onClick={() => navigate(ROUTES.user.login)} variant="primary" fullWidth>
          {t('auth.register.complete.goToLogin')}
        </PButton>
      </div>,
    )
  }

  if (step === 'verification') {
    return renderShell(
      t('auth.register.verification.subtitle'),
      t('auth.register.verification.title'),
      <>
        {t('auth.register.verification.sentCodeToPrefix')} <span className="font-medium text-gray-900">{email}</span> {t('auth.register.verification.sentCodeToSuffix')}
        <p className="mt-2 text-xs text-gray-500">{t('auth.register.verification.codeValidFor')}</p>
      </>,
      <form className="mt-6 space-y-6" onSubmit={verifyCode}>
        {error && <PAlert variant="error" title={t('auth.register.verification.errorTitle')} message={error} />}

        <div>
          <PInput
            id="verificationCode"
            name="verificationCode"
            type="text"
            required
            label={t('auth.register.verification.codeLabel')}
            placeholder={t('auth.register.verification.codePlaceholder')}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>

        <div>
          <PButton type="submit" disabled={isVerifying} variant="primary" fullWidth loading={isVerifying}>
            {t('auth.register.verification.verifyAndComplete')}
          </PButton>
        </div>

        <div className="text-center">
          <PButton
            type="button"
            variant="ghost"
            onClick={resendCode}
            disabled={resendCooldown > 0 || isSendingCode}
          >
            {resendCooldown > 0
              ? t('auth.register.verification.resendCooldown', { seconds: resendCooldown })
              : isSendingCode
                ? t('auth.register.verification.sending')
                : t('auth.register.verification.resend')}
          </PButton>
        </div>

        <div className="text-center">
          <PButton
            type="button"
            variant="ghost"
            onClick={() => {
              setStep('form')
              setVerificationCode('')
              setError('')
            }}
          >
            {t('auth.register.verification.backToEditEmail')}
          </PButton>
        </div>
      </form>,
    )
  }

  return renderShell(
    t('auth.register.form.subtitle'),
    t('auth.register.form.title'),
    <>
      <p>{t('auth.register.form.description')}</p>
      <p className="mt-2">
        {t('auth.register.form.hasAccount')}{' '}
        <Link to={ROUTES.user.login} className="font-medium text-blue-600 hover:text-blue-500">
          {t('auth.register.form.loginExisting')}
        </Link>
      </p>
    </>,
    <form className="mt-6 space-y-6" onSubmit={submit}>
      {error && <PAlert variant="error" title={t('auth.register.form.errorTitle')} message={error} />}

      <div className="space-y-4">
        <PInput
          id="email"
          name="email"
          type="email"
          required
          label={t('auth.register.form.emailLabel')}
          placeholder={t('auth.register.form.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          {t('auth.register.form.usernamePreviewPrefix')} <span className="font-medium text-gray-700">{usernamePreview || t('auth.register.form.usernamePreviewEmpty')}</span>
        </p>

        <PInput
          id="phone"
          name="phone"
          type="tel"
          label={t('auth.register.form.phoneLabel')}
          placeholder={t('auth.register.form.phonePlaceholder')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <PInput
          id="password"
          name="password"
          type="password"
          required
          label={t('auth.register.form.passwordLabel')}
          placeholder={t('auth.register.form.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
        />
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div
              className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
              style={{ width: `${passwordStrength.percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            {t('auth.register.form.passwordStrengthPrefix')} {passwordStrength.label}{t('auth.register.form.passwordStrengthHint')}
          </p>
        </div>

        <PInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          label={t('auth.register.form.confirmPasswordLabel')}
          placeholder={t('auth.register.form.confirmPasswordPlaceholder')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        />
      </div>

      <PCheckbox
        id="agree-terms"
        name="agree-terms"
        required
        checked={agreeTerms}
        onChange={(e) => setAgreeTerms(e.target.checked)}
        label={
          <>
            {t('auth.register.form.agreePrefix')}{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              {t('auth.register.form.terms')}
            </Link>
            {' '}{t('auth.register.form.and')}{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              {t('auth.register.form.privacy')}
            </Link>
          </>
        }
      />

      <div>
        <PButton
          type="submit"
          disabled={isLoading || !agreeTerms || isPasswordTooShort}
          variant="primary"
          fullWidth
          loading={isLoading}
        >
          {t('auth.register.form.sendCode')}
        </PButton>
      </div>
    </form>,
  )
}

export default Register
