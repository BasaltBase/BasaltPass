import { useState } from 'react'
import { Link } from 'react-router-dom'
import client from '@api/client'
import { useNavigate } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { PInput, PButton, PCheckbox } from '@ui'

function Register() {
  const navigate = useNavigate()
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
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
      // Step 1: 开始注册流程
      const startResponse = await client.post('/api/v1/signup/start', { 
        email, 
        phone, 
        username: email.split('@')[0], // 使用邮箱前缀作为默认用户名
        password 
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
              您的账户已创建成功，现在可以登录了
            </p>
            <div className="mt-6">
              <PButton
                onClick={() => navigate('/login')}
                variant="gradient"
                fullWidth
              >
                前往登录
              </PButton>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 验证码步骤的渲染
  if (step === 'verification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              验证您的邮箱
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              我们已向 <span className="font-medium text-gray-900">{email}</span> 发送了验证码
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={verifyCode}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">验证失败</h3>
                    <div className="mt-2 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <PInput
                id="verificationCode"
                name="verificationCode"
                type="text"
                required
                label="验证码"
                placeholder="请输入6位验证码"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
              />
            </div>

            <div>
              <PButton
                type="submit"
                disabled={isVerifying}
                variant="gradient"
                fullWidth
                loading={isVerifying}
              >
                验证并完成注册
              </PButton>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={resendCode}
                disabled={resendCooldown > 0 || isSendingCode}
                className="text-sm text-blue-600 hover:text-blue-500 disabled:text-gray-400"
              >
                {resendCooldown > 0 
                  ? `${resendCooldown}秒后可重新发送`
                  : isSendingCode 
                    ? '正在发送...'
                    : '重新发送验证码'
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // 默认注册表单步骤
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            创建您的账户
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            或者{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              登录现有账户
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={submit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">注册失败</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          )}
          
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
              placeholder="请输入密码（至少6位）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
            />
            
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
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  服务条款
                </a>
                {' '}和{' '}
                <a href="#" className="text-blue-600 hover:text-blue-500">
                  隐私政策
                </a>
              </>
            }
          />

          <div>
            <PButton
              type="submit"
              disabled={isLoading || !agreeTerms}
              variant="gradient"
              fullWidth
              loading={isLoading}
            >
              发送验证码
            </PButton>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">或者</span>
              </div>
            </div>

            <div className="mt-6">
              <PButton
                type="button"
                onClick={() => (window.location.href = `${import.meta.env.VITE_API_BASE || 'http://localhost:8080'}/api/v1/auth/oauth/google/login`)}
                variant="secondary"
                fullWidth
                leftIcon={
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                }
              >
                使用 Google 注册
              </PButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Register 