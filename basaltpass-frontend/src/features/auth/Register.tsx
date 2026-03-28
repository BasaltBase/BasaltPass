import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '@constants'
import client from '@api/client'
import { useConfig } from '@contexts/ConfigContext'
import { PInput, PButton, PCheckbox, PAlert } from '@ui'

const getPasswordStrength = (value: string) => {
  if (!value) return { label: '未设置', color: 'bg-gray-200', percent: 0 }

  let score = 0
  if (value.length >= 8) score += 1
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score <= 1) return { label: '弱', color: 'bg-red-500', percent: 25 }
  if (score === 2) return { label: '中', color: 'bg-yellow-500', percent: 50 }
  if (score === 3) return { label: '良好', color: 'bg-blue-500', percent: 75 }
  return { label: '强', color: 'bg-green-500', percent: 100 }
}

function Register() {
  const navigate = useNavigate()
  const { siteName, siteInitial, setPageTitle } = useConfig()
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
  const passwordStrength = getPasswordStrength(password)
  const isPasswordTooShort = password.length < 8

  useEffect(() => {
    setPageTitle('注册')
  }, [setPageTitle])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isPasswordTooShort) {
      setError('密码至少需要 8 位')
      return
    }

    if (password !== confirmPassword) {
      setError('密码确认不匹配')
      return
    }

    if (!agreeTerms) {
      setError('请同意服务条款和隐私政策')
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
      setError(err.response?.data?.error || '注册失败，请检查您的信息')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode) {
      setError('请输入验证码')
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
      setError(err.response?.data?.error || '验证码错误，请重试')
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
      setError(err.response?.data?.error || '重发验证码失败')
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
      '账户注册',
      '注册成功',
      <>您的账户已创建成功，现在可以登录了。</>,
      <div className="mt-6">
        <PButton onClick={() => navigate(ROUTES.user.login)} variant="primary" fullWidth>
          前往登录
        </PButton>
      </div>,
    )
  }

  if (step === 'verification') {
    return renderShell(
      '账户注册',
      '验证您的邮箱',
      <>
        我们已向 <span className="font-medium text-gray-900">{email}</span> 发送了验证码。
        <p className="mt-2 text-xs text-gray-500">验证码有效期为 10 分钟</p>
      </>,
      <form className="mt-6 space-y-6" onSubmit={verifyCode}>
        {error && <PAlert variant="error" title="验证失败" message={error} />}

        <div>
          <PInput
            id="verificationCode"
            name="verificationCode"
            type="text"
            required
            label="验证码"
            placeholder="请输入6位验证码"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>

        <div>
          <PButton type="submit" disabled={isVerifying} variant="primary" fullWidth loading={isVerifying}>
            验证并完成注册
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
              ? `${resendCooldown}秒后可重新发送`
              : isSendingCode
                ? '正在发送...'
                : '重新发送验证码'}
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
            返回修改邮箱
          </PButton>
        </div>
      </form>,
    )
  }

  return renderShell(
    '账户注册',
    '创建您的账户',
    <>
      <p>使用邮箱完成注册，创建后即可登录并继续访问您的账户。</p>
      <p className="mt-2">
        已有账户？{' '}
        <Link to={ROUTES.user.login} className="font-medium text-blue-600 hover:text-blue-500">
          登录现有账户
        </Link>
      </p>
    </>,
    <form className="mt-6 space-y-6" onSubmit={submit}>
      {error && <PAlert variant="error" title="注册失败" message={error} />}

      <div className="space-y-4">
        <PInput
          id="email"
          name="email"
          type="email"
          required
          label="邮箱地址"
          placeholder="请输入邮箱地址"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          注册后默认用户名将为: <span className="font-medium text-gray-700">{usernamePreview || '（等待输入邮箱）'}</span>
        </p>

        <PInput
          id="phone"
          name="phone"
          type="tel"
          label="手机号码（可选）"
          placeholder="请输入手机号码"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <PInput
          id="password"
          name="password"
          type="password"
          required
          label="密码"
          placeholder="请输入密码（至少8位）"
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
            密码强度: {passwordStrength.label}（建议包含大小写字母、数字和特殊字符，至少 8 位）
          </p>
        </div>

        <PInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          label="确认密码"
          placeholder="请再次输入密码"
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
            我同意{' '}
            <Link to="/terms" className="text-blue-600 hover:text-blue-500">
              服务条款
            </Link>
            {' '}和{' '}
            <Link to="/privacy" className="text-blue-600 hover:text-blue-500">
              隐私政策
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
          发送验证码
        </PButton>
      </div>
    </form>,
  )
}

export default Register
