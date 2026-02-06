import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantOAuthApi, TenantAppWithClients, CreateTenantOAuthClientRequest, TenantOAuthClient } from '@api/tenant/tenantOAuth'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  apps: TenantAppWithClients[]
}

function CreateClientModal({ isOpen, onClose, onSuccess, apps }: CreateClientModalProps) {
  const [formData, setFormData] = useState<CreateTenantOAuthClientRequest>({
    app_id: 0,
    name: '',
    description: '',
    redirect_uris: [''],
    scopes: ['openid', 'profile', 'email'],
    allowed_origins: ['']
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // 过滤空的URI和Origins
      const cleanedData = {
        ...formData,
        redirect_uris: (formData.redirect_uris || []).filter(uri => uri.trim() !== ''),
        allowed_origins: (formData.allowed_origins || []).filter(origin => origin.trim() !== '')
      }

      await tenantOAuthApi.createClient(cleanedData)
      onSuccess()
      onClose()
      // 重置表单
      setFormData({
        app_id: 0,
        name: '',
        description: '',
        redirect_uris: [''],
        scopes: ['openid', 'profile', 'email'],
        allowed_origins: ['']
      })
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败')
    } finally {
      setIsLoading(false)
    }
  }

  const addRedirectUri = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...prev.redirect_uris, '']
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

  const addAllowedOrigin = () => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: [...(prev.allowed_origins || []), '']
    }))
  }

  const removeAllowedOrigin = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: (prev.allowed_origins || []).filter((_, i) => i !== index)
    }))
  }

  const updateAllowedOrigin = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: (prev.allowed_origins || []).map((origin, i) => i === index ? value : origin)
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-8">
      <div className="relative w-full max-w-3xl mx-4 bg-white shadow-xl rounded-xl border border-gray-100">
        {/* 头部 */}
        <div className="bg-white px-6 py-5 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-md bg-blue-500 p-3">
                  <KeyIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-semibold text-gray-900">创建OAuth客户端</h3>
                <p className="mt-1 text-sm text-gray-500">为您的应用配置OAuth2认证客户端</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
            >
              <span className="sr-only">关闭</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* 基本信息 */}
          <div className="border-b border-gray-200 pb-6">
            <div className="flex items-center mb-4">
              <div className="h-2 w-2 bg-blue-500 rounded-full mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">基本信息</h4>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* 选择应用 */}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关联应用 <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.app_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, app_id: parseInt(e.target.value) }))}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white hover:border-gray-300"
                >
                  <option value={0}>请选择要配置的应用</option>
                  {(apps || []).map(app => (
                    <option key={app.id} value={app.id}>{app.name}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500">选择需要配置OAuth客户端的应用</p>
              </div>

              {/* 客户端名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  客户端名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                  placeholder="例如：Web客户端"
                />
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">客户端描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300 resize-none"
                  rows={3}
                  placeholder="简要描述此客户端的用途..."
                />
              </div>
            </div>
          </div>

          {/* OAuth配置 */}
          <div className="border-b border-gray-200 pb-6">
            <div className="flex items-center mb-4">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">OAuth配置</h4>
            </div>

            {/* 重定向URI */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                重定向URI <span className="text-red-500">*</span>
              </label>
              <div className="space-y-3">
                {(formData.redirect_uris || []).map((uri, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="url"
                        value={uri}
                        onChange={(e) => updateRedirectUri(index, e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                        placeholder="https://example.com/auth/callback"
                      />
                    </div>
                    {(formData.redirect_uris || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRedirectUri(index)}
                        className="inline-flex items-center p-2 border border-red-300 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                        title="删除URI"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addRedirectUri}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  添加重定向URI
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>提示：</strong>用户授权后将重定向到这些地址，请确保地址有效且支持HTTPS
                </p>
              </div>
            </div>

            {/* 权限范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">权限范围</label>
              <div className="grid grid-cols-2 gap-3">
                {['openid', 'profile', 'email', 'offline_access'].map(scope => (
                  <div key={scope} className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200">
                    <input
                      type="checkbox"
                      checked={(formData.scopes || []).includes(scope)}
                      onChange={() => toggleScope(scope)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-3 text-sm font-medium text-gray-900">
                      {scope}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CORS配置 */}
          <div className="pb-6">
            <div className="flex items-center mb-4">
              <div className="h-2 w-2 bg-purple-500 rounded-full mr-3"></div>
              <h4 className="text-lg font-medium text-gray-900">CORS配置</h4>
              <span className="ml-2 text-sm text-gray-500">(可选)</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">允许的来源</label>
              <div className="space-y-3">
                {(formData.allowed_origins || []).map((origin, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-1">
                      <input
                        type="url"
                        value={origin}
                        onChange={(e) => updateAllowedOrigin(index, e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white hover:border-gray-300"
                        placeholder="https://example.com"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAllowedOrigin(index)}
                      className="inline-flex items-center p-2 border border-red-300 rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                      title="删除来源"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAllowedOrigin}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  添加允许的来源
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">配置允许跨域请求的源域名</p>
            </div>
          </div>
        </form>

        {/* 底部按钮 */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-xl flex flex-col sm:flex-row sm:justify-end space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            取消
          </button>
          <button
            type="submit"
            form="oauth-client-form"
            disabled={isLoading}
            onClick={handleSubmit}
            className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                创建中...
              </>
            ) : (
              <>
                <KeyIcon className="h-4 w-4 mr-2" />
                创建客户端
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ClientDetailModalProps {
  client: TenantOAuthClient | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

function ClientDetailModal({ client, isOpen, onClose, onUpdate }: ClientDetailModalProps) {
  const [showSecret, setShowSecret] = useState(false)
  const [newSecret, setNewSecret] = useState('')

  const handleRegenerateSecret = async () => {
    if (!client || !confirm('确定要重新生成客户端密钥吗？这将使现有密钥失效。')) return

    try {
      const response = await tenantOAuthApi.regenerateSecret(client.client_id)
      setNewSecret(response.data.client_secret)
      setShowSecret(true)
      onUpdate()
    } catch (err: any) {
      alert(err.response?.data?.error || '重新生成密钥失败')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('已复制到剪贴板')
  }

  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">OAuth客户端详情</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">关闭</span>
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">客户端ID</label>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm bg-gray-100 p-2 rounded">
                    {client.client_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(client.client_id)}
                    className="text-gray-600 hover:text-gray-800"
                    title="复制"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  client.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {client.is_active ? '激活' : '停用'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
                <p className="text-sm text-gray-900">{client.created_at}</p>
              </div>
            </div>

            {/* 客户端密钥 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">客户端密钥</label>
                <button
                  onClick={handleRegenerateSecret}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <ArrowPathIcon className="h-4 w-4 inline mr-1" />
                  重新生成
                </button>
              </div>
              {newSecret ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800 mb-2">新的客户端密钥（请立即保存，不会再次显示）：</p>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 text-sm bg-white p-2 rounded border">
                      {newSecret}
                    </code>
                    <button
                      onClick={() => copyToClipboard(newSecret)}
                      className="text-yellow-600 hover:text-yellow-800"
                      title="复制"
                    >
                      <ClipboardDocumentIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">密钥已加密存储，无法查看</p>
              )}
            </div>

            {/* 重定向URI */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">重定向URI</label>
              <div className="space-y-2">
                {(client.redirect_uris || []).map((uri, index) => (
                  <div key={index} className="text-sm bg-gray-50 p-2 rounded border">
                    {uri}
                  </div>
                ))}
              </div>
            </div>

            {/* 权限范围 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">权限范围</label>
              <div className="flex flex-wrap gap-2">
                {(client.scopes || []).map(scope => (
                  <span key={scope} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TenantOAuthClients() {
  const [apps, setApps] = useState<TenantAppWithClients[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<TenantOAuthClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const pageSize = 10

  const loadAppsWithClients = async () => {
    try {
      setLoading(true)
      const response = await tenantOAuthApi.listAppsWithClients(page, pageSize, search)
      setApps(response.data.apps || [])
      setTotal(response.data.total || 0)
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败')
      setApps([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAppsWithClients()
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadAppsWithClients()
  }

  const handleDelete = async (client: TenantOAuthClient) => {
    if (!confirm(`确定要删除OAuth客户端 "${client.client_id}" 吗？此操作不可恢复。`)) return

    try {
      await tenantOAuthApi.deleteClient(client.client_id)
      loadAppsWithClients()
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const handleViewDetail = (client: TenantOAuthClient) => {
    setSelectedClient(client)
    setShowDetailModal(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <TenantLayout title="OAuth客户端管理">
      <div>
        {/* 页面头部 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OAuth客户端管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理应用的OAuth2客户端配置
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            创建客户端
          </button>
        </div>

        {/* 搜索 */}
        <div className="flex justify-between items-center mb-6">
          <form onSubmit={handleSearch} className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索应用..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              搜索
            </button>
          </form>
        </div>

        {/* 应用和客户端列表 */}
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto" />
              <p className="mt-2 text-red-600">{error}</p>
              <button
                onClick={loadAppsWithClients}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                重新加载
              </button>
            </div>
          ) : !apps || apps.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">暂无应用</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                创建第一个OAuth客户端
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(apps || []).map((app) => (
                <div key={app.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{app.name}</h3>
                      <p className="text-sm text-gray-500">{app.description}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      app.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {app.status === 'active' ? '激活' : '停用'}
                    </span>
                  </div>

                  {!app.oauth_clients || app.oauth_clients.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <KeyIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 mb-4">该应用暂无OAuth客户端</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                      >
                        创建OAuth客户端
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              客户端ID
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              状态
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              创建时间
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(app.oauth_clients || []).map((client) => (
                            <tr key={client.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  {client.client_id}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  client.is_active 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {client.is_active ? '激活' : '停用'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {client.created_at}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => handleViewDetail(client)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="查看详情"
                                  >
                                    <EyeIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(client)}
                                    className="text-red-600 hover:text-red-900"
                                    title="删除"
                                  >
                                    <TrashIcon className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      共 {total} 个应用
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                      >
                        上一页
                      </button>
                      <span className="px-3 py-1 text-gray-700">
                        第 {page} 页，共 {totalPages} 页
                      </span>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === totalPages}
                        className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 创建客户端模态框 */}
        <CreateClientModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadAppsWithClients}
          apps={apps}
        />

        {/* 客户端详情模态框 */}
        <ClientDetailModal
          client={selectedClient}
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false)
            setSelectedClient(null)
          }}
          onUpdate={loadAppsWithClients}
        />
      </div>
    </TenantLayout>
  )
}
