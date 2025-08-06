import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  BuildingOfficeIcon, 
  CreditCardIcon,
  DocumentTextIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@components/AdminLayout'
import { adminTenantApi, AdminTenantDetailResponse, AdminUpdateTenantRequest, TenantSettings } from '@api/admin/tenant'

const EditTenant: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<AdminTenantDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<AdminUpdateTenantRequest>({
    name: '',
    description: '',
    plan: 'free',
    status: 'active',
    settings: {
      max_users: 100,
      max_apps: 10,
      max_storage: 1024,
      enable_api: true,
      enable_sso: false,
      enable_audit: false,
    }
  })

  useEffect(() => {
    if (id) {
      fetchTenantDetail()
    }
  }, [id])

  const fetchTenantDetail = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      setError(null)
      const response = await adminTenantApi.getTenantDetail(parseInt(id))
      setTenant(response)
      
      // 初始化表单数据
      setFormData({
        name: response.name,
        description: response.description || '',
        plan: response.plan,
        status: response.status,
        settings: response.settings || {
          max_users: 100,
          max_apps: 10,
          max_storage: 1024,
          enable_api: true,
          enable_sso: false,
          enable_audit: false,
        }
      })
    } catch (err: any) {
      console.error('获取租户详情失败:', err)
      setError(err.response?.data?.message || '获取租户详情失败')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSettingChange = (key: keyof TenantSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings!,
        [key]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    
    try {
      setSaving(true)
      setError(null)
      
      await adminTenantApi.updateTenant(parseInt(id), formData)
      
      // 更新成功后跳转到详情页
      navigate(`/admin/tenants/${id}`, { 
        state: { message: '租户更新成功！' }
      })
    } catch (err: any) {
      console.error('更新租户失败:', err)
      setError(err.response?.data?.message || '更新租户失败')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigate(`/admin/tenants/${id}`)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: '活跃' },
      suspended: { color: 'bg-yellow-100 text-yellow-800', text: '暂停' },
      deleted: { color: 'bg-red-100 text-red-800', text: '已删除' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getPlanBadge = (plan: string) => {
    const planConfig = {
      free: { color: 'bg-gray-100 text-gray-800', text: '免费版' },
      basic: { color: 'bg-blue-100 text-blue-800', text: '基础版' },
      premium: { color: 'bg-purple-100 text-purple-800', text: '高级版' },
      enterprise: { color: 'bg-yellow-100 text-yellow-800', text: '企业版' }
    }
    
    const config = planConfig[plan as keyof typeof planConfig] || planConfig.free
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <AdminLayout title="编辑租户">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!tenant) {
    return (
      <AdminLayout title="编辑租户">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">租户不存在</h3>
          <p className="mt-1 text-sm text-gray-500">请检查租户ID是否正确</p>
          <div className="mt-6">
            <button
              onClick={() => navigate('/admin/tenants')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              返回租户列表
            </button>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`编辑租户 - ${tenant.name}`}>
      <div className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">操作失败</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 页面头部 */}
        <div className="lg:flex lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <button
                onClick={() => navigate(`/admin/tenants/${id}`)}
                className="mr-4 p-2 text-gray-400 hover:text-gray-500"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  编辑租户
                </h1>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="text-sm text-gray-500">代码: {tenant.code}</span>
                  <span className="text-gray-300">•</span>
                  {getStatusBadge(tenant.status)}
                  <span className="text-gray-300">•</span>
                  {getPlanBadge(tenant.plan)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 编辑表单 */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* 基本信息 */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
                基本信息
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">租户名称</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">租户代码</label>
                  <input
                    type="text"
                    value={tenant.code}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                    disabled
                  />
                  <p className="mt-1 text-xs text-gray-500">租户代码创建后不可修改</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">描述</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="租户描述信息..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">套餐</label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="free">免费版</option>
                    <option value="basic">基础版</option>
                    <option value="premium">高级版</option>
                    <option value="enterprise">企业版</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">状态</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  >
                    <option value="active">活跃</option>
                    <option value="suspended">暂停</option>
                    <option value="deleted">删除</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 租户设置 */}
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                <CogIcon className="h-5 w-5 mr-2 text-gray-400" />
                租户设置
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">最大用户数</label>
                    <input
                      type="number"
                      value={formData.settings?.max_users || 0}
                      onChange={(e) => handleSettingChange('max_users', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">最大应用数</label>
                    <input
                      type="number"
                      value={formData.settings?.max_apps || 0}
                      onChange={(e) => handleSettingChange('max_apps', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">最大存储 (MB)</label>
                    <input
                      type="number"
                      value={formData.settings?.max_storage || 0}
                      onChange={(e) => handleSettingChange('max_storage', parseInt(e.target.value) || 0)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings?.enable_api || false}
                      onChange={(e) => handleSettingChange('enable_api', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">启用 API 功能</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings?.enable_sso || false}
                      onChange={(e) => handleSettingChange('enable_sso', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">启用 SSO 单点登录</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.settings?.enable_audit || false}
                      onChange={(e) => handleSettingChange('enable_audit', e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">启用审计日志</label>
                  </div>
                </div>
              </div>
            </div>

            {/* 表单按钮 */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? '保存中...' : '保存更改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  )
}

export default EditTenant
