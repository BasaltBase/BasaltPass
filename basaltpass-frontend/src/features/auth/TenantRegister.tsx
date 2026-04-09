import { useEffect, useState, type ReactNode } from 'react'
import PSkeleton from '@ui/PSkeleton'
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom'
import client from '@api/client'
import { useConfig } from '@contexts/ConfigContext'
import { fetchPublicTenantByCode } from '@api/public/tenant'
import { PInput, PButton, PCheckbox, PAlert } from '@ui'
import { useI18n } from '@shared/i18n'

const getPasswordStrength = (value: string, t: (key: string) => string) => {
  if (!value) return { label: t('auth.tenantRegister.passwordStrength.notSet'), color: 'bg-gray-200', percent: 0 }

  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score <= 1) return { label: t('auth.tenantRegister.passwordStrength.weak'), color: 'bg-red-500', percent: 25 }
  if (score === 2) return { label: t('auth.tenantRegister.passwordStrength.medium'), color: 'bg-yellow-500', percent: 50 }
  if (score === 3) return { label: t('auth.tenantRegister.passwordStrength.good'), color: 'bg-blue-500', percent: 75 }
  return { label: t('auth.tenantRegister.passwordStrength.strong'), color: 'bg-green-500', percent: 100 }
}

function TenantRegister() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { siteInitial, setPageTitle } = useConfig()
  const { t } = useI18n()

  const [tenantInfo, setTenantInfo] = useState<{ id: number; name: string; code: string } | null>(null)
  const [loadingTenant, setLoadingTenant] = useState(true)

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
  const inviteToken = searchParams.get('invite_token') || ''
  const invitedEmail = searchParams.get('email') || ''

  const usernamePreview = email.includes('@') ? email.split('@')[0] : email
  const passwordStrength = getPasswordStrength(password, t)
  const isPasswordTooShort = password.length < 8

  useEffect(() => {
    if (tenantInfo?.name) {
      document.title = `${tenantInfo.name} - ${t('auth.tenantRegister.pageTitleSuffix')}`
    } else {
      setPageTitle(t('auth.tenantRegister.pageTitle'))
    }

    return () => {
      setPageTitle(t('userLayout.pageTitle'))
    }
  }, [setPageTitle, tenantInfo?.name, t])

  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        setLoadingTenant(true)
        const tenant = await fetchPublicTenantByCode(tenantCode as string)
        setTenantInfo(tenant)
      } catch (err: any) {
        const code = err?.code
        if (code === 'ECONNABORTED') {
          setError(t('auth.tenant.flow.loadTenantTimeout'))
        } else {
          setError(t('auth.tenant.notFoundDescription'))
        }
      } finally {
        setLoadingTenant(false)
      }
    }

    if (tenantCode) {
      fetchTenantInfo()
    } else {
      setError(t('auth.tenant.flow.missingTenantCode'))
      setLoadingTenant(false)
    }
  }, [tenantCode, t])

  useEffect(() => {
    if (!invitedEmail) return
    setEmail((current) => current || invitedEmail)
  }, [invitedEmail])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tenantInfo) {
      setError(t('auth.tenant.flow.tenantInfoLoadFailed'))
      return
    }

    if (isPasswordTooShort) {
      setError(t('auth.tenantRegister.errors.passwordMinLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.tenantRegister.errors.passwordMismatch'))
      return
    }

    if (!agreeTerms) {
      setError(t('auth.tenantRegister.errors.agreeTermsRequired'))
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
        tenant_id: tenantInfo.id,
      })

      setSignupId(startResponse.data.signup_id)

      await client.post('/api/v1/signup/send_email_code', {
        signup_id: startResponse.data.signup_id,
      })

      setStep('verification')
      startResendCooldown()
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.tenantRegister.errors.registerFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode) {
      setError(t('auth.tenantRegister.errors.verificationCodeRequired'))
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
      setError(err.response?.data?.error || t('auth.tenantRegister.errors.verifyCodeFailed'))
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
      setError(err.response?.data?.error || t('auth.tenantRegister.errors.resendCodeFailed'))
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
                <p className="text-sm font-medium text-gray-900">{tenantInfo?.name || tenantCode}</p>
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

  if (loadingTenant) {
    return <PSkeleton.PageLoader message={t('auth.tenant.loadingTenantInfo')} />
  }

  if (!tenantInfo && !loadingTenant) {
    return renderShell(
      t('auth.tenantRegister.common.subtitle'),
      t('auth.tenant.notFoundTitle'),
      <>{error || t('auth.tenant.notFoundDescription')}</>,
      <div className="mt-6">
        <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
          {t('auth.tenantRegister.actions.backToLoginPage')}
        </Link>
      </div>,
    )
  }

  if (step === 'complete') {
    return renderShell(
      t('auth.tenantRegister.common.subtitle'),
      t('auth.tenantRegister.complete.title'),
      <>
        {t('auth.tenantRegister.complete.descriptionPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span> {t('auth.tenantRegister.complete.descriptionSuffix')}
      </>,
      <div className="mt-6">
        <PButton onClick={() => navigate(`/auth/tenant/${tenantCode}/login`)} variant="primary" fullWidth>
          {t('auth.tenantRegister.complete.goToLogin')}
        </PButton>
      </div>,
    )
  }

  if (step === 'verification') {
    return renderShell(
      t('auth.tenantRegister.common.subtitle'),
      t('auth.tenantRegister.verification.title'),
      <>
        {t('auth.tenantRegister.verification.sentCodeToPrefix')} <span className="font-medium text-gray-900">{email}</span> {t('auth.tenantRegister.verification.sentCodeToSuffix')}
        <p className="mt-2 text-xs text-gray-500">{t('auth.tenantRegister.verification.registeringToPrefix')} {tenantInfo?.name}</p>
      </>,
      <form className="mt-6 space-y-6" onSubmit={verifyCode}>
        {error && <PAlert variant="error" title={t('auth.tenantRegister.verification.errorTitle')} message={error} />}

        <div>
          <PInput
            id="verification-code"
            name="code"
            type="text"
            required
            label={t('auth.tenantRegister.verification.codeLabel')}
            placeholder={t('auth.tenantRegister.verification.codePlaceholder')}
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>

        <div>
          <PButton type="submit" disabled={isVerifying || !verificationCode} variant="primary" fullWidth loading={isVerifying}>
            {t('auth.tenantRegister.verification.verifyAndComplete')}
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
              ? t('auth.tenantRegister.verification.resendCooldown', { seconds: resendCooldown })
              : isSendingCode
                ? t('auth.tenantRegister.verification.sending')
                : t('auth.tenantRegister.verification.resend')}
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
            {t('auth.tenantRegister.verification.backToEdit')}
          </PButton>
        </div>
      </form>,
    )
  }

  return renderShell(
    t('auth.tenantRegister.common.subtitle'),
    t('auth.tenantRegister.form.title'),
    <>
      <p>{t('auth.tenantRegister.form.descriptionPrefix')} <span className="font-medium text-gray-900">{tenantInfo?.name}</span>{t('auth.tenantRegister.form.descriptionSuffix')}</p>
      {inviteToken && invitedEmail && (
        <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {t('auth.tenantRegister.form.inviteHintPrefix')} <span className="font-medium">{invitedEmail}</span> {t('auth.tenantRegister.form.inviteHintSuffix')}
        </p>
      )}
      <p className="mt-2">
        {t('auth.tenantRegister.form.hasAccount')}{' '}
        <Link
          to={`/auth/tenant/${tenantCode}/login${invitedEmail ? `?email=${encodeURIComponent(invitedEmail)}` : ''}`}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          {t('auth.tenantRegister.form.loginNow')}
        </Link>
      </p>
    </>,
    <form className="mt-6 space-y-6" onSubmit={submit}>
      {error && <PAlert variant="error" title={t('auth.tenantRegister.form.errorTitle')} message={error} />}

      <div className="space-y-4">
        <PInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={t('auth.tenantRegister.form.emailLabel')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('auth.tenantRegister.form.emailPlaceholder')}
        />
        <p className="text-xs text-gray-500">
          {t('auth.tenantRegister.form.usernamePreviewPrefix')} <span className="font-medium text-gray-700">{usernamePreview || t('auth.tenantRegister.form.usernamePreviewEmpty')}</span>
        </p>

        <PInput
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          label={t('auth.tenantRegister.form.phoneLabel')}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t('auth.tenantRegister.form.phonePlaceholder')}
        />

        <PInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          label={t('auth.tenantRegister.form.passwordLabel')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('auth.tenantRegister.form.passwordPlaceholder')}
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
            {t('auth.tenantRegister.form.passwordStrengthPrefix')} {passwordStrength.label}{t('auth.tenantRegister.form.passwordStrengthHint')}
          </p>
        </div>

        <PInput
          id="confirm-password"
          name="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          label={t('auth.tenantRegister.form.confirmPasswordLabel')}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t('auth.tenantRegister.form.confirmPasswordPlaceholder')}
          showPassword={showConfirmPassword}
          onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
        />
      </div>

      <PCheckbox
        id="agree-terms"
        checked={agreeTerms}
        onChange={(e) => setAgreeTerms(e.target.checked)}
        label={
          <>
            {t('auth.tenantRegister.form.agreePrefix')}{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              {t('auth.tenantRegister.form.terms')}
            </Link>{' '}
            {t('auth.tenantRegister.form.and')}{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              {t('auth.tenantRegister.form.privacy')}
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
          {t('auth.tenantRegister.form.sendCode')}
        </PButton>
      </div>
    </form>,
  )
}

export default TenantRegister
