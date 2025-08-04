import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  KeyIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { appApi, OAuthClientInfo, CreateOAuthClientRequest, UpdateOAuthClientRequest } from '@api/admin/app'
import AdminLayout from '@components/AdminLayout'

export default function OAuthClientConfig() {
  const { appId } = useParams<{ appId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [client, setClient] = useState<OAuthClientInfo | null>(null)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<CreateOAuthClientRequest>({
    app_id: appId || '',
    client_type: 'public',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scopes: ['openid', 'profile', 'email'],
    redirect_uris: ['']
  })

  useEffect(() => {
    if (appId) {
      loadOAuthClient()
    }
  }, [appId])

  const loadOAuthClient = async () => {
    if (!appId) return

    try {
      setLoading(true)
      const response = await appApi.getOAuthClient(appId)
      setClient(response)
      
      // 如果存在OAuth客户端，填充表单
      if (response) {
        setFormData(prev => ({
          ...prev,
          grant_types: response.grant_types || ['authorization_code', 'refresh_token'],
          response_types: response.response_types || ['code'],
          scopes: response.scopes || ['openid', 'profile', 'email'],
          redirect_uris: response.redirect_uris || ['']
        }))
      }
    } catch (error) {
      console.error('Failed to load OAuth client:', error)
      setError('加载OAuth配置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!appId) return

    try {
      setSaving(true)
      
      // 过滤空的重定向URI
      const cleanedData = {
        ...formData,
        redirect_uris: (formData.redirect_uris || []).filter(uri => uri.trim())
      }

      if (client) {
        // 更新现有客户端
        const updateData: UpdateOAuthClientRequest = {
          grant_types: cleanedData.grant_types,
          response_types: cleanedData.response_types,
          scopes: cleanedData.scopes,
          redirect_uris: cleanedData.redirect_uris
        }
        await appApi.updateOAuthClient(client.id, updateData)
      } else {
        // 创建新客户端
        await appApi.createOAuthClient(cleanedData)
      }
      
      await loadOAuthClient()
      setError(null)
    } catch (error) {
      console.error('Failed to save OAuth client:', error)
      setError(client ? '更新OAuth配置失败' : '创建OAuth配置失败')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateSecret = async () => {
    if (!client || !confirm('确定要重新生成客户端密钥吗？这将使现有的密钥失效。')) {
      return
    }

    try {
      setSaving(true)
      await appApi.regenerateClientSecret(client.id)
      await loadOAuthClient()
      setError(null)
    } catch (error) {
      console.error('Failed to regenerate secret:', error)
      setError('重新生成密钥失败')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板')
    }).catch(() => {
      alert('复制失败，请手动复制')
    })
  }

  const addRedirectUri = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...(prev.redirect_uris || []), '']
    }))
  }

  const removeRedirectUri = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: (prev.redirect_uris || []).filter((_, i) => i !== index)
    }))
  }

  const updateRedirectUri = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: (prev.redirect_uris || []).map((uri, i) => i === index ? value : uri)
    }))
  }

  const toggleScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: (prev.scopes || []).includes(scope)
        ? (prev.scopes || []).filter(s => s !== scope)
        : [...(prev.scopes || []), scope]
    }))
  }

  const availableScopes = [
    { id: 'openid', name: 'OpenID Connect', description: '基础身份验证' },
    { id: 'profile', name: '用户资料', description: '访问用户基本信息' },
    { id: 'email', name: '邮箱地址', description: '访问用户邮箱' },
    { id: 'offline_access', name: '离线访问', description: '获取刷新令牌' }
  ]

  const availableGrantTypes = [
    { id: 'authorization_code', name: '授权码模式', description: '标准的OAuth2流程' },
    { id: 'refresh_token', name: '刷新令牌', description: '使用刷新令牌获取新的访问令牌' },
    { id: 'client_credentials', name: '客户端凭据', description: '服务器到服务器的认证' }
  ]

  if (loading) {
    return (
      <AdminLayout title="OAuth客户端配置">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="OAuth客户端配置">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <button
          onClick={() => navigate('/admin/apps')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          返回应用列表
        </button>
        
        {/* 页面头部 */}
        <div className="flex items-center">
          <KeyIcon className="h-8 w-8 mr-3 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">OAuth 客户端配置</h1>
            <p className="mt-1 text-sm text-gray-500">
              {client ? '管理现有的OAuth客户端' : '为应用创建OAuth客户端'}
            </p>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* 客户端信息 */}
          {client && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">客户端凭据</h3>
                <p className="mt-1 text-sm text-gray-500">
                  在你的应用中使用这些凭据进行OAuth认证
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">客户端 ID</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <input
                      type="text"
                      value={client.client_id}
                      readOnly
                      className="flex-1 border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(client.client_id)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      title="复制"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">客户端密钥</label>
                  <div className="mt-1 flex items-center space-x-2">
                    <input
                      type={showSecret ? "text" : "password"}
                      value={client.client_secret}
                      readOnly
                      className="flex-1 border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm"
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      title={showSecret ? "隐藏" : "显示"}
                    >
                      {showSecret ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(client.client_secret)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      title="复制"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleRegenerateSecret}
                      disabled={saving}
                      className="inline-flex items-center p-2 border border-orange-300 rounded-md text-orange-700 hover:bg-orange-50 disabled:opacity-50"
                      title="重新生成"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    请妥善保管客户端密钥，不要在客户端代码中暴露
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">客户端类型</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.client_type === 'public' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {client.client_type === 'public' ? '公开客户端' : '机密客户端'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 配置表单 */}
          <div className="bg-white shadow rounded-lg">
            <form onSubmit={handleCreateOrUpdate}>
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">OAuth 配置</h3>
                <p className="mt-1 text-sm text-gray-500">
                  配置OAuth客户端的行为和权限
                </p>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* 客户端类型 */}
                {!client && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">客户端类型</label>
                    <div className="space-y-3">
                      {[
                        { 
                          id: 'public', 
                          name: '公开客户端', 
                          description: '前端应用（如SPA、移动应用），无法安全存储密钥'
                        },
                        { 
                          id: 'confidential', 
                          name: '机密客户端', 
                          description: '后端应用，可以安全存储客户端密钥'
                        }
                      ].map((type) => (
                        <div
                          key={type.id}
                          className={`relative rounded-lg border p-4 cursor-pointer focus:outline-none ${
                            formData.client_type === type.id
                              ? 'border-indigo-500 ring-2 ring-indigo-500'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          onClick={() => setFormData(prev => ({ ...prev, client_type: type.id as any }))}
                        >
                          <div className="flex items-center">
                            <input
                              type="radio"
                              name="client_type"
                              value={type.id}
                              checked={formData.client_type === type.id}
                              onChange={() => setFormData(prev => ({ ...prev, client_type: type.id as any }))}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                            />
                            <div className="ml-3">
                              <label className="block text-sm font-medium text-gray-900">
                                {type.name}
                              </label>
                              <p className="text-sm text-gray-500">{type.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 授权类型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">授权类型</label>
                  <div className="space-y-2">
                    {availableGrantTypes.map((grantType) => (
                      <div key={grantType.id} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={(formData.grant_types || []).includes(grantType.id)}
                            onChange={() => {
                              setFormData(prev => ({
                                ...prev,
                                grant_types: (prev.grant_types || []).includes(grantType.id)
                                  ? (prev.grant_types || []).filter(g => g !== grantType.id)
                                  : [...(prev.grant_types || []), grantType.id]
                              }))
                            }}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-900">
                            {grantType.name}
                          </label>
                          <p className="text-sm text-gray-500">{grantType.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 权限范围 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">权限范围</label>
                  <div className="space-y-2">
                    {availableScopes.map((scope) => (
                      <div key={scope.id} className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            type="checkbox"
                            checked={(formData.scopes || []).includes(scope.id)}
                            onChange={() => toggleScope(scope.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3">
                          <label className="text-sm font-medium text-gray-900">
                            {scope.name}
                          </label>
                          <p className="text-sm text-gray-500">{scope.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 重定向URI */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重定向 URI
                  </label>
                  <div className="space-y-2">
                    {(formData.redirect_uris || []).map((uri, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="url"
                          value={uri}
                          onChange={(e) => updateRedirectUri(index, e.target.value)}
                          className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          placeholder="https://example.com/auth/callback"
                        />
                        {(formData.redirect_uris || []).length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRedirectUri(index)}
                            className="inline-flex items-center p-2 border border-red-300 rounded-md text-red-700 hover:bg-red-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRedirectUri}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      添加重定向URI
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    用户授权后将重定向到这些地址
                  </p>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/admin/apps')}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : (client ? '更新配置' : '创建客户端')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
