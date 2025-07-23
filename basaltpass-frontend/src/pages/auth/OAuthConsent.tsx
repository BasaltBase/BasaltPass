import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ConsentPageData {
  client: {
    id: number
    name: string
    description: string
  }
  scopes: string[]
  redirect_uri: string
  state?: string
  client_id: string
}

export default function OAuthConsent() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // 从URL参数中获取OAuth授权信息
  const clientName = searchParams.get('client_name') || '未知应用'
  const clientDescription = searchParams.get('client_description') || ''
  const scopes = searchParams.get('scope')?.split(' ') || []
  const redirectUri = searchParams.get('redirect_uri') || ''
  const state = searchParams.get('state') || ''
  const clientId = searchParams.get('client_id') || ''

  const handleAllow = async () => {
    setLoading(true)
    setError('')

    try {
      // 构建表单数据
      const formData = new FormData()
      formData.append('action', 'allow')
      formData.append('client_id', clientId)
      formData.append('redirect_uri', redirectUri)
      formData.append('scope', scopes.join(' '))
      if (state) {
        formData.append('state', state)
      }

      // 发送同意请求
      const response = await fetch('/oauth/consent', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (response.ok) {
        // 成功的话会重定向，这里不会执行到
        window.location.href = response.url
      } else {
        throw new Error('授权失败')
      }
    } catch (err: any) {
      setError(err.message || '授权失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleDeny = async () => {
    setLoading(true)
    
    try {
      // 构建表单数据
      const formData = new FormData()
      formData.append('action', 'deny')
      formData.append('client_id', clientId)
      formData.append('redirect_uri', redirectUri)
      if (state) {
        formData.append('state', state)
      }

      // 发送拒绝请求
      const response = await fetch('/oauth/consent', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (response.ok) {
        // 成功的话会重定向，这里不会执行到
        window.location.href = response.url
      } else {
        throw new Error('取消授权失败')
      }
    } catch (err: any) {
      setError(err.message || '操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 检查参数完整性
  useEffect(() => {
    if (!clientId || !redirectUri) {
      setError('授权请求参数不完整')
    }
  }, [clientId, redirectUri])

  // 权限范围的友好名称映射
  const getScopeDisplayName = (scope: string) => {
    const scopeNames: Record<string, string> = {
      'openid': '基本身份信息',
      'profile': '用户资料',
      'email': '邮箱地址',
      'phone': '手机号码',
      'address': '地址信息',
      'read': '读取权限',
      'write': '写入权限',
      'admin': '管理员权限'
    }
    return scopeNames[scope] || scope
  }

  const getScopeDescription = (scope: string) => {
    const scopeDescriptions: Record<string, string> = {
      'openid': '允许应用确认您的身份',
      'profile': '允许应用访问您的基本资料（昵称、头像等）',
      'email': '允许应用访问您的邮箱地址',
      'phone': '允许应用访问您的手机号码',
      'address': '允许应用访问您的地址信息',
      'read': '允许应用读取您的数据',
      'write': '允许应用修改您的数据',
      'admin': '允许应用执行管理员操作'
    }
    return scopeDescriptions[scope] || `允许应用访问 ${scope} 相关数据`
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <ShieldCheckIcon className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          授权确认
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          应用请求访问您的账户信息
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error ? (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">错误</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 应用信息 */}
              <div className="mb-6">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-xl font-bold">
                      {clientName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {clientName}
                  </h3>
                  {clientDescription && (
                    <p className="mt-1 text-sm text-gray-500">
                      {clientDescription}
                    </p>
                  )}
                </div>
              </div>

              {/* 权限信息 */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  该应用将获得以下权限：
                </h4>
                <div className="space-y-2">
                  {scopes.map((scope) => (
                    <div key={scope} className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2"></div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {getScopeDisplayName(scope)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getScopeDescription(scope)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 警告信息 */}
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">注意</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      只有当您信任该应用时才应授权。授权后，该应用将能够访问您的相关信息。
                    </p>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex space-x-3">
                <button
                  onClick={handleDeny}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '处理中...' : '拒绝'}
                </button>
                <button
                  onClick={handleAllow}
                  disabled={loading}
                  className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? '处理中...' : '授权'}
                </button>
              </div>

              {/* 底部说明 */}
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  授权后，您可以随时在账户设置中撤销应用的访问权限
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 