import React, { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  ChartBarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { oauthApi, type OAuthClient, type CreateClientRequest } from '../../api/oauth'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/AdminLayout'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function CreateClientModal({ isOpen, onClose, onSuccess }: CreateClientModalProps) {
  const [formData, setFormData] = useState<CreateClientRequest>({
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
        redirect_uris: formData.redirect_uris.filter(uri => uri.trim() !== ''),
        allowed_origins: formData.allowed_origins?.filter(origin => origin.trim() !== '') || []
      }

      await oauthApi.createClient(cleanedData)
      onSuccess()
      onClose()
      // 重置表单
      setFormData({
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

  const addRedirectURI = () => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: [...prev.redirect_uris, '']
    }))
  }

  const removeRedirectURI = (index: number) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.filter((_, i) => i !== index)
    }))
  }

  const updateRedirectURI = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      redirect_uris: prev.redirect_uris.map((uri, i) => i === index ? value : uri)
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
      allowed_origins: prev.allowed_origins?.filter((_, i) => i !== index) || []
    }))
  }

  const updateAllowedOrigin = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_origins: prev.allowed_origins?.map((origin, i) => i === index ? value : origin) || []
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
      <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">创建OAuth2客户端</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 第一行：应用名称和应用描述 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用名称 *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="输入应用名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="输入应用描述"
                rows={3}
              />
            </div>
          </div>

          {/* 第二行：重定向URI（全宽） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重定向URI *</label>
            {formData.redirect_uris.map((uri, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  required
                  value={uri}
                  onChange={(e) => updateRedirectURI(index, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://yourapp.com/callback"
                />
                {formData.redirect_uris.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRedirectURI(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRedirectURI}
              className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + 添加重定向URI
            </button>
          </div>

          {/* 第三行：权限范围（全宽） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">权限范围</label>
            <div className="grid grid-cols-3 gap-3">
              {['openid', 'profile', 'email', 'phone', 'address'].map((scope) => (
                <label key={scope} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.scopes?.includes(scope) || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          scopes: [...(prev.scopes || []), scope]
                        }))
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          scopes: prev.scopes?.filter(s => s !== scope) || []
                        }))
                      }
                    }}
                    className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{scope}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 第四行：允许的CORS源（全宽） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">允许的CORS源</label>
            {formData.allowed_origins?.map((origin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={origin}
                  onChange={(e) => updateAllowedOrigin(index, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="https://yourapp.com"
                />
                <button
                  type="button"
                  onClick={() => removeAllowedOrigin(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAllowedOrigin}
              className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + 添加CORS源
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>
          )}

          {/* 按钮区域 */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface ClientDetailModalProps {
  client: OAuthClient | null
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

function ClientDetailModal({ client, isOpen, onClose, onUpdate }: ClientDetailModalProps) {
  const [showSecret, setShowSecret] = useState(false)
  const [newSecret, setNewSecret] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleRegenerateSecret = async () => {
    if (!client || !confirm('确定要重新生成客户端密钥吗？这会使现有的密钥失效。')) return

    setIsRegenerating(true)
    try {
      const response = await oauthApi.regenerateSecret(client.client_id)
      setNewSecret(response.data.data.client_secret)
      setShowSecret(true)
      onUpdate()
    } catch (err) {
      console.error('重新生成密钥失败:', err)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
      <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">客户端详情</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* 左侧信息 */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用名称</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{client.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">应用描述</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{client.description || '-'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">客户端ID</label>
              <p className="text-sm text-gray-900 font-mono bg-gray-100 p-3 rounded-md">
                {client.client_id}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">状态</label>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                client.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {client.is_active ? '激活' : '停用'}
              </span>
            </div>
          </div>

          {/* 右侧信息 */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">客户端密钥</label>
              <div className="flex items-center gap-2">
                {newSecret ? (
                  <p className="text-sm text-gray-900 font-mono bg-yellow-100 p-3 rounded-md flex-1">
                    {newSecret}
                  </p>
                ) : (
                  <p className="text-sm text-gray-900 font-mono bg-gray-100 p-3 rounded-md flex-1">
                    ••••••••••••••••
                  </p>
                )}
                <button
                  onClick={handleRegenerateSecret}
                  disabled={isRegenerating}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  {isRegenerating ? '生成中...' : '重新生成'}
                </button>
              </div>
              {newSecret && (
                <p className="text-sm text-yellow-600 mt-2 bg-yellow-50 p-2 rounded-md">
                  ⚠️ 请妥善保存新密钥，关闭后将无法再次查看
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">创建时间</label>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{client.created_at}</p>
            </div>

            {client.last_used_at && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">最后使用</label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{client.last_used_at}</p>
              </div>
            )}
          </div>
        </div>

        {/* 全宽信息 */}
        <div className="mt-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">重定向URI</label>
            <div className="space-y-2">
              {client.redirect_uris.map((uri, index) => (
                <p key={index} className="text-sm text-gray-900 font-mono bg-gray-100 p-3 rounded-md">
                  {uri}
                </p>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">权限范围</label>
            <div className="flex flex-wrap gap-2">
              {client.scopes.map((scope) => (
                <span key={scope} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 按钮区域 */}
        <div className="flex justify-end pt-6 mt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OAuthClients() {
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<OAuthClient | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const pageSize = 10

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await oauthApi.listClients(page, pageSize, search)
      setClients(response.data.data.clients)
      setTotal(response.data.data.total)
    } catch (err: any) {
      setError(err.response?.data?.error || '加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    loadClients()
  }

  const handleDelete = async (client: OAuthClient) => {
    if (!confirm(`确定要删除客户端 "${client.name}" 吗？此操作不可恢复。`)) return

    try {
      await oauthApi.deleteClient(client.client_id)
      loadClients()
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const handleViewDetail = (client: OAuthClient) => {
    setSelectedClient(client)
    setShowDetailModal(true)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminLayout title="OAuth客户端管理">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/dashboard" className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">OAuth2客户端管理</span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OAuth2客户端管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理业务应用的OAuth2客户端配置
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            创建客户端
          </button>
        </div>

        {/* 搜索 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索客户端名称、描述或ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-blue-700"
            >
              搜索
            </button>
          </form>
        </div>

        {/* 客户端列表 */}
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto" />
              <p className="mt-2 text-red-600">{error}</p>
              <button
                onClick={loadClients}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-blue-700"
              >
                重新加载
              </button>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">暂无OAuth2客户端</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-blue-700"
              >
                创建第一个客户端
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        应用信息
                      </th>
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
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {client.description || '-'}
                            </div>
                          </div>
                        </td>
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

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    显示 {(page - 1) * pageSize + 1} 到 {Math.min(page * pageSize, total)} 条，共 {total} 条
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                    >
                      上一页
                    </button>
                    <span className="px-3 py-1">
                      {page} / {totalPages}
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
              )}
            </>
          )}
        </div>

      {/* 创建客户端模态框 */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={loadClients}
      />

      {/* 客户端详情模态框 */}
      <ClientDetailModal
        client={selectedClient}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false)
          setSelectedClient(null)
        }}
        onUpdate={loadClients}
      />
      </div>
    </AdminLayout>
  )
} 