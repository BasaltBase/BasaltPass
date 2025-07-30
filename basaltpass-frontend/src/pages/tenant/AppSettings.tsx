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
import TenantLayout from '../../components/TenantLayout'
import { tenantAppApi, TenantApp, UpdateTenantAppRequest } from '../../api/tenantApp'

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
        logo_url: appData.logo_url || '',
        homepage_url: appData.homepage_url || '',
        privacy_policy_url: appData.privacy_policy_url || '',
        terms_of_service_url: appData.terms_of_service_url || '',
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
      navigate('/tenant/apps')
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
              <button
                onClick={fetchAppDetail}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                重试
              </button>
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
              <Link
                to="/tenant/apps"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                返回应用列表
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
              to="/tenant/apps"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700">应用名称</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入应用名称"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">应用描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入应用描述"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">活跃</option>
                    <option value="inactive">停用</option>
                    <option value="pending">待激活</option>
                  </select>
                </div>
              </div>
            </div>

            {/* URL配置 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">URL配置</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => handleInputChange('logo_url', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">主页URL</label>
                  <input
                    type="url"
                    value={formData.homepage_url}
                    onChange={(e) => handleInputChange('homepage_url', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">隐私政策URL</label>
                  <input
                    type="url"
                    value={formData.privacy_policy_url}
                    onChange={(e) => handleInputChange('privacy_policy_url', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/privacy"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">服务条款URL</label>
                  <input
                    type="url"
                    value={formData.terms_of_service_url}
                    onChange={(e) => handleInputChange('terms_of_service_url', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/terms"
                  />
                </div>
              </div>
            </div>

            {/* OAuth回调地址 */}
            <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">OAuth回调地址</h2>
                <button
                  onClick={addCallbackUrl}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  添加
                </button>
              </div>
              
              <div className="space-y-3">
                {formData.callback_urls.map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => handleCallbackUrlChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com/callback"
                    />
                    {formData.callback_urls.length > 1 && (
                      <button
                        onClick={() => removeCallbackUrl(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
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
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <CheckIcon className="w-4 h-4 mr-2" />
                      保存设置
                    </>
                  )}
                </button>
                
                <Link
                  to={`/tenant/apps/${app.id}`}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </Link>
              </div>
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
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                删除应用
              </button>
            </div>
          </div>
        </div>

        {/* 删除确认对话框 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
              
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-red-500 focus:border-red-500"
                placeholder="输入应用名称"
              />
              
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== app.name}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认删除
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmText('')
                  }}
                  className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
