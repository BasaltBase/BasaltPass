import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import PInput from '@ui/PInput'
import PTextarea from '@ui/PTextarea'
import PSelect from '@ui/PSelect'
import PButton from '@ui/PButton'
import { tenantAppApi, TenantApp, UpdateTenantAppRequest } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'

export default function AppSettings() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<TenantApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    homepage_url: '',
    privacy_policy_url: '',
    terms_of_service_url: '',
    is_verified: false,
    callback_urls: [''],
    status: 'active' as 'active' | 'inactive' | 'pending'
  })

  useEffect(() => {
    if (id) {
      fetchAppDetail()
    }
  }, [id])

  const fetchAppDetail = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await tenantAppApi.getTenantApp(id)
      const appData = response.data
      setApp(appData)
      
      // 填充表单数据
      setFormData({
        name: appData.name || '',
        description: appData.description || '',
        logo_url: appData.logo_url || (appData as any).icon_url || '',
        homepage_url: appData.homepage_url || '',
        privacy_policy_url: appData.privacy_policy_url || '',
        terms_of_service_url: appData.terms_of_service_url || '',
        is_verified: appData.is_verified ?? false,
        callback_urls: appData.callback_urls?.length > 0 ? appData.callback_urls : [''],
        status: appData.status || 'active'
      })
    } catch (err: any) {
      console.error('获取应用详情失败:', err)
      setError(err.response?.data?.error || '获取应用详情失败')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleCallbackUrlChange = (index: number, value: string) => {
    const newCallbackUrls = [...formData.callback_urls]
    newCallbackUrls[index] = value
    setFormData(prev => ({
      ...prev,
      callback_urls: newCallbackUrls
    }))
  }

  const addCallbackUrl = () => {
    setFormData(prev => ({
      ...prev,
      callback_urls: [...prev.callback_urls, '']
    }))
  }

  const removeCallbackUrl = (index: number) => {
    if (formData.callback_urls.length === 1) return
    const newCallbackUrls = formData.callback_urls.filter((_, i) => i !== index)
    setFormData(prev => ({
      ...prev,
      callback_urls: newCallbackUrls
    }))
  }

  const handleSave = async () => {
    if (!id || !app) return

    try {
      setSaving(true)
      
      // 准备更新数据，过滤空的回调URL
      const updateData: UpdateTenantAppRequest = {
        name: formData.name,
        description: formData.description,
        logo_url: formData.logo_url || undefined,
        homepage_url: formData.homepage_url || undefined,
        privacy_policy_url: formData.privacy_policy_url || undefined,
        terms_of_service_url: formData.terms_of_service_url || undefined,
        is_verified: formData.is_verified,
        callback_urls: formData.callback_urls.filter(url => url.trim() !== ''),
        status: formData.status
      }

      await tenantAppApi.updateTenantApp(id, updateData)
      
      // 重新获取应用数据
      await fetchAppDetail()
      
      // 显示成功消息
      alert('应用设置已保存')
    } catch (err: any) {
      console.error('保存失败:', err)
      alert(err.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !app) return
    if (deleteConfirmText !== app.name) {
      alert('请输入正确的应用名称以确认删除')
      return
    }

    try {
      await tenantAppApi.deleteTenantApp(id)
      navigate(ROUTES.tenant.apps)
    } catch (err: any) {
      console.error('删除失败:', err)
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'inactive':
        return '停用'
      case 'pending':
        return '待激活'
      default:
        return '未知'
    }
  }

  if (loading) {
    return (
      <TenantLayout title="应用设置">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="应用设置">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={fetchAppDetail}>重试</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  if (!app) {
    return (
      <TenantLayout title="应用设置">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Cog6ToothIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">应用不存在</h3>
            <div className="mt-6">
              <Link to={ROUTES.tenant.apps}>
                <PButton>返回应用列表</PButton>
              </Link>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={`${app.name} - 设置`}>
      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* 导航栏 */}
        <div className="mb-6">
          <nav className="flex items-center space-x-4">
            <Link
              to={ROUTES.tenant.apps}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              应用列表
            </Link>
            <span className="text-gray-300">/</span>
            <Link
              to={`/tenant/apps/${app.id}`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {app.name}
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-900">设置</span>
          </nav>
        </div>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">应用设置</h1>
              <p className="mt-2 text-gray-600">管理应用的基本信息和配置</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(app.status)}`}>
                {getStatusText(app.status)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 主设置区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本信息 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">基本信息</h2>
              
              <div className="space-y-4">
                <PInput
                  label="应用名称"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
                  placeholder="输入应用名称"
                />

                <PTextarea
                  label="应用描述"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', (e.target as HTMLTextAreaElement).value)}
                  rows={3}
                  placeholder="输入应用描述"
                />

                <PSelect
                  label="状态"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', (e.target as HTMLSelectElement).value)}
                >
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                  <option value="pending">待激活</option>
                </PSelect>
              </div>
            </div>

            {/* URL配置 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">URL配置</h2>
              
              <div className="space-y-4">
                <PInput
                  label="Logo URL"
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => handleInputChange('logo_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/logo.png"
                />

                <PInput
                  label="主页URL"
                  type="url"
                  value={formData.homepage_url}
                  onChange={(e) => handleInputChange('homepage_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com"
                />

                <PInput
                  label="隐私政策URL"
                  type="url"
                  value={formData.privacy_policy_url}
                  onChange={(e) => handleInputChange('privacy_policy_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/privacy"
                />

                <PInput
                  label="服务条款URL"
                  type="url"
                  value={formData.terms_of_service_url}
                  onChange={(e) => handleInputChange('terms_of_service_url', (e.target as HTMLInputElement).value)}
                  placeholder="https://example.com/terms"
                />

                {/* 认证徽章开关 */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: '#1d9bf0' }}
                    >
                      <svg viewBox="0 0 24 24" fill="white" className="h-5 w-5">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">标记为认证应用</p>
                      <p className="text-xs text-gray-500">
                        认证应用将在 OAuth 授权页面上显示蓝色验证徽章，表明该应用由租户运营并受信任
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.is_verified}
                    onClick={() => setFormData(prev => ({ ...prev, is_verified: !prev.is_verified }))}
                    className={`ml-4 relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.is_verified ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        formData.is_verified ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* OAuth回调地址 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">OAuth回调地址</h2>
                <PButton variant="secondary" size="sm" onClick={addCallbackUrl} leftIcon={<PlusIcon className="w-4 h-4" />}>添加</PButton>
              </div>
              
              <div className="space-y-3">
                {formData.callback_urls.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <PInput
                        type="url"
                        value={url}
                        onChange={(e) => handleCallbackUrlChange(index, (e.target as HTMLInputElement).value)}
                        placeholder="https://example.com/callback"
                        autoComplete="off"
                      />
                    </div>
                    {formData.callback_urls.length > 1 && (
                      <PButton 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => removeCallbackUrl(index)}
                        aria-label="移除"
                        leftIcon={<XMarkIcon className="w-4 h-4" />}
                      >移除</PButton>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 保存按钮 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">操作</h3>
              <div className="space-y-3">
                <PButton
                  onClick={handleSave}
                  loading={saving}
                  fullWidth
                  leftIcon={!saving ? <CheckIcon className="w-4 h-4" /> : undefined}
                >
                  {saving ? '保存中...' : '保存设置'}
                </PButton>
                
                <Link to={`/tenant/apps/${app.id}`}>
                  <PButton variant="secondary" fullWidth>
                    取消
                  </PButton>
                </Link>
              </div>
            </div>

            {/* OAuth客户端 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-medium text-gray-900">OAuth客户端</h3>
                <Link to={ROUTES.tenant.oauthClients} className="shrink-0">
                  <PButton variant="secondary" size="sm">管理</PButton>
                </Link>
              </div>

              {!app.oauth_clients || app.oauth_clients.length === 0 ? (
                <div className="text-sm text-gray-500">
                  暂无 OAuth 客户端
                </div>
              ) : (
                <div className="space-y-4">
                  {app.oauth_clients.map((client) => (
                    <div key={client.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900 break-all">
                            {client.client_id}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            创建于 {new Date(client.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                          {client.is_active ? '启用' : '停用'}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium text-gray-500">Redirect URIs</div>
                        {client.redirect_uris && client.redirect_uris.length > 0 ? (
                          <div className="mt-2 space-y-1">
                            {client.redirect_uris.map((uri) => (
                              <div key={uri} className="text-xs font-mono text-gray-800 bg-gray-50 border border-gray-200 rounded px-2 py-1 break-all">
                                {uri}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-1 text-sm text-gray-500">未配置</div>
                        )}
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-medium text-gray-500 mb-2">Scopes</div>
                        <div className="flex flex-wrap gap-2">
                          {(client.scopes || []).map((scope) => (
                            <span key={scope} className="inline-flex px-2 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 rounded">
                              {scope}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 应用信息 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">应用信息</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">应用ID</dt>
                  <dd className="text-sm text-gray-900 font-mono">{app.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">创建时间</dt>
                  <dd className="text-sm text-gray-900">{new Date(app.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">最后更新</dt>
                  <dd className="text-sm text-gray-900">{new Date(app.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            {/* 危险区域 */}
            <div className="bg-white shadow-sm border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-red-900 mb-4">危险区域</h3>
              <p className="text-sm text-gray-600 mb-4">
                删除应用将永久移除所有相关数据，此操作不可撤销。
              </p>
              <PButton
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                fullWidth
                leftIcon={<TrashIcon className="w-4 h-4" />}
              >
                删除应用
              </PButton>
            </div>
          </div>
        </div>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 !m-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">确认删除</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                此操作将永久删除应用 <strong>{app.name}</strong> 及其所有数据。
              </p>
              
              <p className="text-sm text-gray-600 mb-4">
                请输入应用名称 <strong>{app.name}</strong> 以确认删除：
              </p>
              
              <div className="mb-4">
                <PInput
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText((e.target as HTMLInputElement).value)}
                  placeholder="输入应用名称"
                />
              </div>
              
              <div className="flex space-x-3">
                <PButton
                  variant="danger"
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== app.name}
                  className="flex-1"
                >
                  确认删除
                </PButton>
                <PButton
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  className="flex-1"
                >
                  取消
                </PButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
