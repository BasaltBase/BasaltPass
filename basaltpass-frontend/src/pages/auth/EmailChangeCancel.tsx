import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '../../api/client'

function EmailChangeCancel() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const cancelEmailChange = async () => {
      if (!token) {
        setStatus('error')
        setMessage('无效的取消链接')
        return
      }

      try {
        const response = await client.delete(`/api/v1/security/email/cancel?token=${token}`)
        setStatus('success')
        setMessage(response.data.message || '邮箱变更已取消')
      } catch (err: any) {
        setStatus('error')
        setMessage(err.response?.data?.error || '取消失败')
      }
    }

    cancelEmailChange()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto h-12 w-12 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center animate-pulse">
                <svg className="h-6 w-6 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                正在处理...
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                请稍候，我们正在取消您的邮箱变更请求
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto h-12 w-12 bg-orange-500 rounded-full flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                邮箱变更已取消
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6 p-4 bg-orange-50 rounded-md border border-orange-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-orange-800">
                      取消成功
                    </h3>
                    <div className="mt-2 text-sm text-orange-700">
                      <p>您的邮箱变更请求已被取消，您的邮箱地址保持不变。</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8">
                <a
                  href="/user/settings"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  返回账户设置
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
                操作失败
              </h2>
              <p className="mt-2 text-center text-sm text-red-600">
                {message}
              </p>
              <div className="mt-6 p-4 bg-red-50 rounded-md border border-red-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      取消失败
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>可能的原因：</p>
                      <ul className="mt-1 list-disc pl-5">
                        <li>取消链接已过期</li>
                        <li>邮箱变更请求已被处理</li>
                        <li>无效的取消令牌</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 space-y-4">
                <a
                  href="/user/settings"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  返回账户设置
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

export default EmailChangeCancel