import { useState, useEffect } from 'react'
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
import Layout from '../../components/Layout'
import { oauthApi, type OAuthClient, type CreateClientRequest } from '../../api/oauth'

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">创建OAuth2客户端</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">应用名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入应用名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">应用描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="输入应用描述"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">重定向URI *</label>
            {formData.redirect_uris.map((uri, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  required
                  value={uri}
                  onChange={(e) => updateRedirectURI(index, e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourapp.com/callback"
                />
                {formData.redirect_uris.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRedirectURI(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRedirectURI}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + 添加重定向URI
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">权限范围</label>
            <div className="grid grid-cols-3 gap-2">
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
                    className="mr-2"
                  />
                  {scope}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">允许的CORS源</label>
            {formData.allowed_origins?.map((origin, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="url"
                  value={origin}
                  onChange={(e) => updateAllowedOrigin(index, e.target.value)}
                  className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://yourapp.com"
                />
                <button
                  type="button"
                  onClick={() => removeAllowedOrigin(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addAllowedOrigin}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              + 添加CORS源
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">客户端详情</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">应用名称</label>
            <p className="mt-1 text-sm text-gray-900">{client.name}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">应用描述</label>
            <p className="mt-1 text-sm text-gray-900">{client.description || '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">客户端ID</label>
            <p className="mt-1 text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded">
              {client.client_id}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">客户端密钥</label>
            <div className="mt-1 flex items-center gap-2">
              {newSecret ? (
                <p className="text-sm text-gray-900 font-mono bg-yellow-100 p-2 rounded flex-1">
                  {newSecret}
                </p>
              ) : (
                <p className="text-sm text-gray-900 font-mono bg-gray-100 p-2 rounded flex-1">
                  ••••••••••••••••
                </p>
              )}
              <button
                onClick={handleRegenerateSecret}
                disabled={isRegenerating}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                {isRegenerating ? '生成中...' : '重新生成'}
              </button>
            </div>
            {newSecret && (
              <p className="text-sm text-yellow-600 mt-1">
                ⚠️ 请妥善保存新密钥，关闭后将无法再次查看
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">重定向URI</label>
            <div className="mt-1 space-y-1">
              {client.redirect_uris.map((uri, index) => (
                <p key={index} className="text-sm text-gray-900 font-mono bg-gray-100 p-1 rounded">
                  {uri}
                </p>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">权限范围</label>
            <div className="mt-1 flex flex-wrap gap-1">
              {client.scopes.map((scope) => (
                <span key={scope} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {scope}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">状态</label>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              client.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {client.is_active ? '激活' : '停用'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">创建时间</label>
            <p className="mt-1 text-sm text-gray-900">{client.created_at}</p>
          </div>

          {client.last_used_at && (
            <div>
              <label className="block text-sm font-medium text-gray-700">最后使用</label>
              <p className="mt-1 text-sm text-gray-900">{client.last_used_at}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">OAuth2客户端管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理业务应用的OAuth2客户端配置
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                重新加载
              </button>
            </div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">暂无OAuth2客户端</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
    </Layout>
  )
} 