import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import client from '@api/client'
import { PInput, PButton } from '@ui'
import { ROUTES } from '@constants'

function ResetPassword() {
  const navigate = useNavigate()
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
      setSuccess('如果该邮箱存在，我们已发送密码重置邮件')
    } catch (err: any) {
      setError(err.response?.data?.error || '请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    
    setIsLoading(true)
    setError('')
    
    try {
      await client.post('/api/v1/security/password/reset/confirm', {
        token,
        new_password: newPassword
      })
      setSuccess('密码重置成功！正在跳转到登录页面...')
      setTimeout(() => navigate(ROUTES.user.login), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || '重置失败')
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
              重置密码
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              输入您的邮箱地址，我们将发送重置链接
            </p>
          </div>
          
          {success ? (
            <div className="rounded-md bg-green-50 p-4">
              <div className="text-sm text-green-700 text-center">
                {success}
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-6" onSubmit={handleRequestReset}>
              <div>
                <PInput
                  label="邮箱地址"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="输入您的邮箱地址"
                  required
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-700 text-center">
                    {error}
                  </div>
                </div>
              )}

              <div>
                <PButton
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={isLoading}
                >
                  发送重置邮件
                </PButton>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.user.login)}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  返回登录
                </button>
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
            设置新密码
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            请输入您的新密码
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4">
            <div className="text-sm text-green-700 text-center">
              {success}
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
            <div>
              <PInput
                label="新密码"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="输入新密码"
                required
              />
            </div>

            <div>
              <PInput
                label="确认新密码"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="再次输入新密码"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700 text-center">
                  {error}
                </div>
              </div>
            )}

            <div>
              <PButton
                type="submit"
                variant="primary"
                className="w-full"
                loading={isLoading}
              >
                重置密码
              </PButton>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword