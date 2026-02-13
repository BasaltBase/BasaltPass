import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import client from '@api/client'
import { fetchPublicTenantByCode } from '@api/publicTenant'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { PInput, PButton, PCheckbox } from '@ui'

/**
 * 租户专属注册页面
 * 用户通过 /auth/tenant/:tenantCode/register 访问此页面
 * 该页面会自动获取租户信息并在注册时带上租户ID
 */
function TenantRegister() {
  const { tenantCode } = useParams<{ tenantCode: string }>()
  const navigate = useNavigate()
  
  // 租户信息
  const [tenantInfo, setTenantInfo] = useState<{ id: number; name: string; code: string } | null>(null)
  const [loadingTenant, setLoadingTenant] = useState(true)

  useEffect(() => {
    if (tenantInfo?.name) {
      document.title = `${tenantInfo.name} - 注册`
    } else {
      document.title = '租户注册'
    }

    return () => {
      document.title = 'BasaltPass - User Console'
    }
  }, [tenantInfo?.name])
  
  // 注册流程状态
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
  
  // 验证码相关状态
  const [signupId, setSignupId] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!tenantInfo) {
      setError('租户信息加载失败')
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
      // Step 1: 开始注册流程，自动带上租户ID
      const startResponse = await client.post('/api/v1/signup/start', { 
        email, 
        phone, 
        username: email.split('@')[0], // 使用邮箱前缀作为默认用户名
        password,
        tenant_id: tenantInfo.id  // 自动发送租户ID
      })
      
      setSignupId(startResponse.data.signup_id)
      
      // Step 2: 自动发送验证码
      await client.post('/api/v1/signup/send_email_code', {
        signup_id: startResponse.data.signup_id
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
      // 验证验证码
      await client.post('/api/v1/signup/verify_email_code', {
        signup_id: signupId,
        code: verificationCode
      })
      
      // 完成注册
      await client.post('/api/v1/signup/complete', {
        signup_id: signupId
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
        signup_id: signupId
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
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 加载中
  if (loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载租户信息...</p>
        </div>
      </div>
    )
  }

  // 租户不存在
  if (!tenantInfo && !loadingTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">租户不存在</h2>
          <p className="text-gray-600 mb-6">{error || '该租户不存在或已被禁用'}</p>
          <Link to="/login" className="text-indigo-600 hover:text-indigo-500">
            返回登录页面
          </Link>
        </div>
      </div>
    )
  }

  // 完成步骤的渲染
  if (step === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              注册成功！
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              您在 <span className="font-semibold text-indigo-600">{tenantInfo?.name}</span> 的账户已创建成功
            </p>
            <div className="mt-6">
              <PButton
                onClick={() => navigate(`/auth/tenant/${tenantCode}/login`)}
                className="w-full"
              >
                前往登录
              </PButton>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 验证码步骤
  if (step === 'verification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
          <div>
            <h2 className="text-center text-3xl font-extrabold text-gray-900">
              验证邮箱
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              我们已向 <span className="font-semibold">{email}</span> 发送验证码
            </p>
            <p className="mt-1 text-center text-sm text-gray-500">
              注册租户: <span className="font-semibold text-indigo-600">{tenantInfo?.name}</span>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={verifyCode}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700">
                验证码
              </label>
              <PInput
                id="verification-code"
                name="code"
                type="text"
                required
                value={verificationCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVerificationCode(e.target.value)}
                placeholder="请输入6位验证码"
                maxLength={6}
                className="mt-1"
              />
            </div>

            <div>
              <PButton
                type="submit"
                disabled={isVerifying || !verificationCode}
                className="w-full"
              >
                {isVerifying ? '验证中...' : '验证并完成注册'}
              </PButton>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={resendCode}
                disabled={resendCooldown > 0 || isSendingCode}
                className="text-sm text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 
                  ? `${resendCooldown}秒后可重发` 
                  : isSendingCode 
                    ? '发送中...' 
                    : '重新发送验证码'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // 注册表单
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            注册账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            注册到 <span className="font-semibold text-indigo-600">{tenantInfo?.name}</span>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={submit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                邮箱地址 <span className="text-red-500">*</span>
              </label>
              <PInput
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                手机号 <span className="text-gray-400 text-xs">(可选)</span>
              </label>
              <PInput
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
                placeholder="+86 138 0013 8000"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <PInput
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="至少6个字符"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <PInput
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <PCheckbox
              id="agree-terms"
              checked={agreeTerms}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAgreeTerms(e.target.checked)}
            />
            <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
              我同意{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                服务条款
              </a>{' '}
              和{' '}
              <a href="#" className="text-indigo-600 hover:text-indigo-500">
                隐私政策
              </a>
            </label>
          </div>

          <div>
            <PButton
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? '注册中...' : '注册'}
            </PButton>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">已有账户？</span>{' '}
            <Link
              to={`/auth/tenant/${tenantCode}/login`}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              立即登录
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TenantRegister
