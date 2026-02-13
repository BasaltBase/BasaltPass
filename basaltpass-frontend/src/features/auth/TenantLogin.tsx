import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@constants'
import client from '@api/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { loginWithPasskeyFlow } from '@api/oauth/passkey'
import { isPasskeySupported } from '@utils/webauthn'
import { fetchPublicTenantByCode } from '@api/publicTenant'
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline'
import { PInput, PButton, PCheckbox } from '@ui'

/**
 * 租户专属登录页面
 * 用户通过 /auth/tenant/:tenantCode/login 访问此页面
 * 该页面会自动带上租户信息进行登录
 */
function TenantLogin() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  
  // 租户信息
  const [tenantInfo, setTenantInfo] = useState<{ id: number; name: string; code: string } | null>(null)
  const [loadingTenant, setLoadingTenant] = useState(true)

  useEffect(() => {
    if (tenantInfo?.name) {
      document.title = `${tenantInfo.name} - 登录`
    } else {
      document.title = '租户登录'
    }

    return () => {
      document.title = 'BasaltPass - User Console'
    }
  }, [tenantInfo?.name])
  
  // 登录状态
  const [step, setStep] = useState(1)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 二次验证相关
  const [userId, setUserId] = useState<number | null>(null)
  const [twoFAType, setTwoFAType] = useState<string>('')
  const [available2FAMethods, setAvailable2FAMethods] = useState<string[]>([])
  const [twoFACode, setTwoFACode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  const redirectParam = searchParams.get('redirect') || ''

  // 加载租户信息
  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        setLoadingTenant(true)
        const tenant = await fetchPublicTenantByCode(tenantCode as string)
        setTenantInfo(tenant)
      } catch (err: any) {
        const code = err?.code
        if (code === 'ECONNABORTED') {
          setError('加载租户信息超时，请检查后端服务是否可用')
        } else {
          setError('租户不存在或已被禁用')
        }
      } finally {
        setLoadingTenant(false)
      }
    }

    if (tenantCode) {
      fetchTenantInfo()
    } else {
      setError('租户代码缺失，请检查访问链接')
      setLoadingTenant(false)
    }
  }, [tenantCode])

  const redirectAfterLogin = () => {
    if (!redirectParam) return false

    const apiBase = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8080'
    const base = String(apiBase).replace(/\/$/, '')
    const target = redirectParam.startsWith('http://') || redirectParam.startsWith('https://')
      ? redirectParam
      : redirectParam.startsWith('/')
        ? base + redirectParam
        : base + '/' + redirectParam

    window.location.href = target
    return true
  }

  // 登录第一步：用户名密码
  const submitPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenantInfo) {
      setError('租户信息加载失败')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const res = await client.post('/api/v1/auth/login', {
        identifier,
        password,
        tenant_id: tenantInfo.id, // 带上租户ID
      })
      if (res.data.need_2fa) {
        setUserId(res.data.user_id)
        setTwoFAType(res.data['2fa_type'])
        setAvailable2FAMethods(res.data.available_2fa_methods || [])
        setStep(2)
      } else if (res.data.access_token) {
        await login(res.data.access_token)
        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard)
        }
      } else {
        setError('未知的登录响应')
      }
    } catch (err: any) {
      const raw = err?.response?.data?.error || err?.response?.data?.message || err?.message || ''
      const msg = typeof raw === 'string' ? raw.toLowerCase() : ''
      if (msg.includes('invalid credentials') || msg.includes('invalid email or password')) {
        setError('邮箱或手机号或密码错误')
        setStep(1)
        setPassword('')
        setUserId(null)
        setTwoFAType('')
        setAvailable2FAMethods([])
        setTwoFACode('')
        setEmailCode('')
      } else {
        setError(raw || '登录失败，请检查您的凭据')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 切换2FA方式
  const switch2FAMethod = (method: string) => {
    setTwoFAType(method)
    setTwoFACode('')
    setEmailCode('')
    setError('')
  }

  // 获取2FA方式显示名称
  const get2FAMethodName = (method: string) => {
    switch (method) {
      case 'totp': return '验证器应用 (TOTP)'
      case 'passkey': return 'Passkey (生物识别)'
      case 'email': return '邮箱验证码'
      default: return method
    }
  }

  // 获取2FA方式图标
  const get2FAMethodIcon = (method: string) => {
    switch (method) {
      case 'totp': return KeyIcon
      case 'passkey': return ShieldCheckIcon
      case 'email': return EnvelopeIcon
      default: return KeyIcon
    }
  }

  // 登录第二步：二次验证
  const submit2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      let payload: any = {
        user_id: userId,
        two_fa_type: twoFAType,
      }
      if (twoFAType === 'totp') {
        payload.code = twoFACode
      } else if (twoFAType === 'email') {
        payload.code = emailCode
      } else if (twoFAType === 'passkey') {
        try {
          const passkeyResult = await loginWithPasskeyFlow(identifier)
          await login(passkeyResult.access_token)
          if (!redirectAfterLogin()) {
            navigate(ROUTES.user.dashboard)
          }
          return
        } catch (err: any) {
          setError(err.message || 'Passkey验证失败')
          setIsLoading(false)
          return
        }
      }

      const res = await client.post('/api/v1/auth/verify-2fa', payload)
      if (res.data.access_token) {
        await login(res.data.access_token)
        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard)
        }
      } else {
        setError('验证失败')
      }
    } catch (err: any) {
      const raw = err?.response?.data?.error || err?.response?.data?.message || err?.message || ''
      setError(raw || '验证失败')
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在加载租户信息...</p>
        </div>
      </div>
    )
  }

  if (!tenantInfo && !loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">租户不存在</h2>
          <p className="text-gray-600 mb-6">该租户不存在或已被禁用，请检查您的访问链接。</p>
          <Link to={ROUTES.user.login} className="text-blue-600 hover:text-blue-700 font-medium">
            返回平台登录
          </Link>
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
            {tenantInfo?.name}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            租户登录
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">登录失败</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <form className="mt-8 space-y-6" onSubmit={submitPasswordLogin}>
            <div className="space-y-4">
              <PInput
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                label="邮箱或手机号"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="请输入邮箱或手机号"
              />
              <PInput
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                label="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
            </div>

            <div className="flex items-center justify-between">
              <PCheckbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label="记住我"
              />

              <div className="text-sm">
                <Link to={ROUTES.user.forgotPassword} className="font-medium text-blue-600 hover:text-blue-500">
                  忘记密码？
                </Link>
              </div>
            </div>

            <div>
              <PButton type="submit" loading={isLoading} variant="gradient" fullWidth>
                登录
              </PButton>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-8 space-y-6" onSubmit={submit2FAVerify}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">二次验证</h3>
              <p className="mt-2 text-sm text-gray-600">请完成以下验证以继续登录</p>
            </div>

            {available2FAMethods.length > 1 && (
              <div className="flex justify-center space-x-2">
                {available2FAMethods.map((method) => {
                  const Icon = get2FAMethodIcon(method)
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => switch2FAMethod(method)}
                      className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                        twoFAType === method
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-2" />
                      {get2FAMethodName(method)}
                    </button>
                  )
                })}
              </div>
            )}

            {twoFAType === 'totp' && (
              <div>
                <label htmlFor="totp-code" className="block text-sm font-medium text-gray-700">
                  验证码
                </label>
                <PInput
                  id="totp-code"
                  name="totp-code"
                  type="text"
                  required
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value)}
                  placeholder="请输入6位验证码"
                  className="mt-1"
                />
              </div>
            )}

            {twoFAType === 'email' && (
              <div>
                <label htmlFor="email-code" className="block text-sm font-medium text-gray-700">
                  邮箱验证码
                </label>
                <PInput
                  id="email-code"
                  name="email-code"
                  type="text"
                  required
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="请输入邮箱验证码"
                  className="mt-1"
                />
              </div>
            )}

            {twoFAType === 'passkey' && (
              <div className="text-center p-4 bg-blue-50 rounded-md">
                <ShieldCheckIcon className="h-12 w-12 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-gray-700">点击下方按钮使用Passkey验证</p>
              </div>
            )}

            <div>
              <PButton type="submit" loading={isLoading} fullWidth>
                {twoFAType === 'passkey' ? '使用Passkey验证' : '验证'}
              </PButton>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                返回登录
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <Link 
            to={`/auth/tenant/${tenantCode}/register`}
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            注册新账户
          </Link>
          <Link to={ROUTES.user.login} className="text-blue-600 hover:text-blue-700">
            使用平台账号登录
          </Link>
        </div>
      </div>
    </div>
  )
}

export default TenantLogin
