import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '../../api/client'

function EmailChangeConfirm() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const confirmEmailChange = async () => {
      if (!token) {
        setStatus('error')
        setMessage('无效的验证链接')
        return
      }

      try {
        const response = await client.get(`/api/v1/security/email/confirm?token=${token}`)
        setStatus('success')
        setMessage(response.data.message || '邮箱变更成功')
      } catch (err: any) {
        setStatus('error')
        setMessage(err.response?.data?.error || '验证失败')
      }
    }

    confirmEmailChange()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                正在验证...
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                请稍候，我们正在处理您的邮箱变更请求
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                邮箱变更成功！
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-8">
                <a
                  href="/login"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  返回登录
                </a>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto h-12 w-12 bg-red-500 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                验证失败
              </h2>
              <p className="mt-2 text-center text-sm text-red-600">
                {message}
              </p>
              <div className="mt-8 space-y-4">
                <a
                  href="/user/settings"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  返回设置
                </a>
                <a
                  href="/login"
                  className="w-full flex justify-center py-2 px-4 border border-indigo-300 rounded-md shadow-sm text-sm font-medium text-indigo-600 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  返回登录
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EmailChangeConfirm