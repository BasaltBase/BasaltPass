import { useState, useEffect, type ReactNode } from 'react'
import PSkeleton from '@ui/PSkeleton'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '@constants'
import client from '@api/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@contexts/AuthContext'
import { useConfig } from '@contexts/ConfigContext'
import { loginWithPasskey2FAFlow } from '@api/oauth/passkey'
import { isPasskeySupported } from '@utils/webauthn'
import { resolveSafeRedirectTarget } from '@utils/redirect'
import { fetchPublicTenantByCode } from '@api/publicTenant'
import { decodeJWT } from '@utils/jwt'
import { getAccessToken } from '@utils/auth'
import { listUserConsoleSessions } from '@utils/userSessions'
import { ShieldCheckIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline'
import { PInput, PButton, PCheckbox, PAlert } from '@ui'

/**
 * 租户专属登录页面
 * 用户通过 /auth/tenant/:tenantCode/login 访问此页面
 * 该页面会自动带上租户信息进行登录
 */
function TenantLogin() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const { siteName, setPageTitle } = useConfig()
  const [searchParams] = useSearchParams()
  
  // 租户信息
  const [tenantInfo, setTenantInfo] = useState<{ id: number; name: string; code: string } | null>(null)
  const [loadingTenant, setLoadingTenant] = useState(true)

  useEffect(() => {
    if (tenantInfo?.name) {
      document.title = `${tenantInfo.name} - 登录`
    } else {
      setPageTitle('租户登录')
    }

    return () => {
      setPageTitle('用户中心')
    }
  }, [siteName, setPageTitle, tenantInfo?.name])
  
  // 登录状态
  const [step, setStep] = useState(1)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 二次验证相关
  const [preAuthToken, setPreAuthToken] = useState('')
  const [twoFAType, setTwoFAType] = useState<string>('')
  const [available2FAMethods, setAvailable2FAMethods] = useState<string[]>([])
  const [twoFACode, setTwoFACode] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isResolvingTenantSession, setIsResolvingTenantSession] = useState(true)

  const redirectParam = searchParams.get('redirect') || ''
  const authRequestTimeout = Number((import.meta as any).env?.VITE_AUTH_TIMEOUT_MS || 12000)
  const resolvedApiBase = String(
    client.defaults.baseURL || (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8101'
  ).replace(/\/$/, '')

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

  useEffect(() => {
    if (!tenantInfo?.id) {
      return
    }

    if (isAuthLoading) {
      return
    }

    const targetTenantID = tenantInfo.id
    const activeToken = getAccessToken()
    const activeDecoded = activeToken ? decodeJWT(activeToken) : null
    const activeTenantID = Number(activeDecoded?.tid || 0)
    const activeScope = String(activeDecoded?.scp || 'user')

    if (isAuthenticated && activeScope === 'user' && activeTenantID === targetTenantID) {
      setIsResolvingTenantSession(false)
      if (!redirectAfterLogin()) {
        navigate(ROUTES.user.dashboard, { replace: true })
      }
      return
    }

    const storedTenantSession = listUserConsoleSessions().find(
      (session) => Number(session.tenant_id || 0) === targetTenantID,
    )

    if (!storedTenantSession) {
      setIsResolvingTenantSession(false)
      return
    }

    let cancelled = false
    setIsResolvingTenantSession(true)

    login(storedTenantSession.token)
      .then(() => {
        if (cancelled) {
          return
        }
        if (!redirectAfterLogin()) {
          navigate(ROUTES.user.dashboard, { replace: true })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsResolvingTenantSession(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isAuthLoading, login, navigate, tenantInfo?.id])

  const redirectAfterLogin = () => {
    const target = resolveSafeRedirectTarget(redirectParam, resolvedApiBase)
    if (!target) return false

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
      }, { timeout: authRequestTimeout })
      if (res.data.need_2fa) {
        setPreAuthToken(res.data.pre_auth_token || '')
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
        setPreAuthToken('')
        setTwoFAType('')
        setAvailable2FAMethods([])
        setTwoFACode('')
        setEmailCode('')
      } else if (err?.code === 'ECONNABORTED' || msg.includes('timeout')) {
        setError(`登录请求超时：请确认 ${siteName} 后端已运行在 ${resolvedApiBase}`)
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
        pre_auth_token: preAuthToken,
        two_fa_type: twoFAType,
      }
      if (twoFAType === 'totp') {
        payload.code = twoFACode
      } else if (twoFAType === 'email') {
        payload.code = emailCode
      } else if (twoFAType === 'passkey') {
        try {
          const passkeyResult = await loginWithPasskey2FAFlow(preAuthToken)
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

      const res = await client.post('/api/v1/auth/verify-2fa', payload, { timeout: authRequestTimeout })
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
      const msg = typeof raw === 'string' ? raw.toLowerCase() : ''
      if (err?.code === 'ECONNABORTED' || msg.includes('timeout')) {
        setError(`二次验证请求超时：请确认 ${siteName} 后端可访问`)
      } else {
        setError(raw || '验证失败')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingTenant || isResolvingTenantSession) {
    return (
      <PSkeleton.PageLoader message={loadingTenant ? "正在加载租户信息..." : "正在检查租户登录状态..."} />
    )
  }

  const renderShell = (subtitle: string, title: string, description: ReactNode, content: ReactNode) => (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-8 shadow-sm sm:px-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900">
                <span className="text-sm font-semibold text-white">{tenantInfo?.name?.slice(0, 1) || '?'}</span>
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

  if (!tenantInfo && !loadingTenant) {
    return renderShell(
      '租户登录',
      '租户不存在',
      <>该租户不存在或已被禁用，请检查您的访问链接。</>,
      <div className="mt-6">
        <Link to={ROUTES.user.login} className="font-medium text-blue-600 hover:text-blue-500">
          返回平台登录
        </Link>
      </div>,
    )
  }

  return (
    renderShell(
      '租户登录',
      '欢迎回来',
      <>
        使用邮箱或手机号登录，继续访问 <span className="font-medium text-gray-900">{tenantInfo?.name}</span>。
      </>,
      <>
        {error && <div className="mt-6"><PAlert variant="error" title="登录失败" message={error} /></div>}
        {tenantInfo && (() => {
          if (isAuthLoading || !isAuthenticated) {
            return null
          }

          const token = getAccessToken()
          const decoded = token ? decodeJWT(token) : null
          const currentTenantID = Number(decoded?.tid || 0)
          const currentScope = String(decoded?.scp || 'user')
          const mismatch = currentScope === 'user' && currentTenantID > 0 && currentTenantID !== tenantInfo.id
          if (!mismatch) {
            return null
          }
          return (
            <div className="mt-6">
              <PAlert
                variant="info"
                title="检测到其他租户会话"
                message="当前浏览器已登录其他租户账户。只有当前会话属于本租户时才会视为已登录；你仍然可以继续登录这个租户。"
              />
            </div>
          )
        })()}

        {step === 1 && (
          <form className="mt-6 space-y-6" onSubmit={submitPasswordLogin}>
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
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  忘记密码？
                </a>
              </div>
            </div>

            <div>
              <PButton type="submit" loading={isLoading} variant="primary" fullWidth>
                登录
              </PButton>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="mt-6 space-y-6" onSubmit={submit2FAVerify}>
            {error && <PAlert variant="error" message={error} />}

            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900">二次验证</h3>
              <p className="mt-2 text-sm text-gray-600">请完成以下验证以继续登录</p>
            </div>

            {available2FAMethods.length > 1 && (
              <div className="flex justify-center space-x-2">
                {available2FAMethods.map((method) => {
                  const Icon = get2FAMethodIcon(method)
                  return (
                    <PButton
                      key={method}
                      type="button"
                      variant={twoFAType === method ? 'primary' : 'secondary'}
                      onClick={() => switch2FAMethod(method)}
                      leftIcon={<Icon className="h-5 w-5" />}
                    >
                      {get2FAMethodName(method)}
                    </PButton>
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
              <PButton type="button" variant="ghost" onClick={() => setStep(1)}>
                返回登录
              </PButton>
            </div>
          </form>
        )}

        <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
          <Link 
            to={`/auth/tenant/${tenantCode}/register`}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            注册新账户
          </Link>
          <Link to={ROUTES.user.login} className="text-blue-600 hover:text-blue-500">
            使用平台账号登录
          </Link>
        </div>
      </>,
    )
  )
}

export default TenantLogin
