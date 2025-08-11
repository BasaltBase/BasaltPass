import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '../../api/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { loginWithPasskeyFlow } from '@api/oauth/passkey'
import { isPasskeySupported } from '../../utils/webauthn'
import { EyeIcon, EyeSlashIcon, ShieldCheckIcon, EnvelopeIcon, KeyIcon } from '@heroicons/react/24/outline'
import { PInput, PButton, PCheckbox } from '../../components'

function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  // step: 1-用户名密码，2-二次验证
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

  // 登录第一步：用户名密码
  const submitPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      const res = await client.post('/api/v1/auth/login', {
        identifier,
        password,
      })
      if (res.data.need_2fa) {
        setUserId(res.data.user_id)
        setTwoFAType(res.data['2fa_type'])
        setAvailable2FAMethods(res.data.available_2fa_methods || [])

        setStep(2)
      } else if (res.data.access_token) {
        login(res.data.access_token)
        navigate('/dashboard')
      } else {
        setError('未知的登录响应')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请检查您的凭据')
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
        // 进行真正的Passkey验证
        try {
          const passkeyResult = await loginWithPasskeyFlow(identifier)
          login(passkeyResult.access_token)
          navigate('/dashboard')
          return // 直接返回，不需要调用verify-2fa API
        } catch (err: any) {
          setError(err.message || 'Passkey验证失败')
          setIsLoading(false)
          return
        }
      }
      const res = await client.post('/api/v1/auth/verify-2fa', payload)
      login(res.data.access_token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || '二次验证失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 渲染二次验证表单
  const render2FAForm = () => {
    
    
    // 如果有多种2FA方式，显示选择界面
    if (available2FAMethods.length > 1) {
      return (
        <div className="mt-8 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">选择验证方式</h3>
            <div className="space-y-3">
              {available2FAMethods.map((method) => {
                const IconComponent = get2FAMethodIcon(method)
                const isSelected = method === twoFAType
                return (
                  <PButton
                    key={method}
                    type="button"
                    variant={isSelected ? "primary" : "ghost"}
                    fullWidth
                    onClick={() => switch2FAMethod(method)}
                    leftIcon={<IconComponent className={`h-5 w-5 ${
                      isSelected ? 'text-white' : 'text-gray-400'
                    }`} />}
                    className={`justify-start ${
                      isSelected
                        ? 'border-blue-500 bg-blue-600'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className={`font-medium ${
                      isSelected ? 'text-white' : 'text-gray-900'
                    }`}>
                      {get2FAMethodName(method)}
                    </span>
                    {isSelected && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </PButton>
                )
              })}
            </div>
          </div>
          
          {/* 显示选中的2FA方式表单 */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">
              使用 {get2FAMethodName(twoFAType)} 验证
            </h4>
            {render2FAInputForm()}
          </div>
        </div>
      )
    }
    
    // 只有一种2FA方式，直接显示表单
    return (
      <div className="mt-8 space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">二次验证</h3>
          <p className="text-sm text-gray-600">
            请使用 {get2FAMethodName(twoFAType)} 完成验证
          </p>
        </div>
        {render2FAInputForm()}
      </div>
    )
  }

  // 渲染具体的2FA输入表单
  const render2FAInputForm = () => {
    if (twoFAType === 'totp') {
      return (
        <form className="space-y-6" onSubmit={submit2FAVerify}>
          <div className="space-y-4">
            <PInput
              id="2fa-code"
              name="2fa-code"
              type="text"
              required
              maxLength={6}
              label="二步验证码"
              placeholder="请输入6位验证码"
              value={twoFACode}
              onChange={(e) => setTwoFACode(e.target.value)}
            />
          </div>
          <div>
            <PButton
              type="submit"
              disabled={isLoading}
              variant="gradient"
              fullWidth
              loading={isLoading}
            >
              验证登录
            </PButton>
          </div>
        </form>
      )
    } else if (twoFAType === 'email') {
      return (
        <form className="space-y-6" onSubmit={submit2FAVerify}>
          <div className="space-y-4">
            <PInput
              id="email-code"
              name="email-code"
              type="text"
              required
              label="邮箱验证码"
              placeholder="请输入邮箱收到的验证码"
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
            />
          </div>
          <div>
            <PButton
              type="submit"
              disabled={isLoading}
              variant="gradient"
              fullWidth
              loading={isLoading}
            >
              验证登录
            </PButton>
          </div>
        </form>
      )
    } else if (twoFAType === 'passkey') {
      return (
        <form className="space-y-6" onSubmit={submit2FAVerify}>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    使用Passkey进行二次验证
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>点击验证后，您的设备将提示您进行生物识别验证或使用安全密钥。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <PButton
              type="submit"
              disabled={isLoading}
              variant="gradient"
              fullWidth
              loading={isLoading}
              leftIcon={<ShieldCheckIcon className="h-5 w-5" />}
            >
              使用Passkey验证
            </PButton>
          </div>
        </form>
      )
    }
    return null
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
            欢迎回到 BasaltPass
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或者{' '}
            <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
              创建新账户
            </Link>
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
                required
                label="邮箱或手机号"
                placeholder="请输入邮箱或手机号"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
              <PInput
                id="password"
                name="password"
                type="password"
                required
                label="密码"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              <PButton
                type="submit"
                disabled={isLoading}
                variant="gradient"
                fullWidth
                loading={isLoading}
              >
                登录
              </PButton>
            </div>
          </form>
        )}
        {step === 2 && render2FAForm()}
      </div>
    </div>
  )
}

export default Login 