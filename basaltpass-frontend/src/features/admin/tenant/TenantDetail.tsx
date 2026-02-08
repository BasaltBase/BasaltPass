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
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  CalendarIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PInput, PSelect, PTextarea, PCheckbox, PButton } from '@ui'
import { adminTenantApi, AdminTenantDetailResponse, AdminUpdateTenantRequest, TenantSettings } from '@api/admin/tenant'
import { ROUTES } from '@constants'

const TenantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<AdminTenantDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    
    try {
      setUpdating(true)
      setError(null)
      
      await adminTenantApi.updateTenant(parseInt(id), formData)
      
      // 刷新数据
      await fetchTenantDetail()
      setEditMode(false)
    } catch (err: any) {
      console.error('更新租户失败:', err)
      setError(err.response?.data?.message || '更新租户失败')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!id || !tenant) return
    
    if (!confirm(`确定要删除租户 "${tenant.name}" 吗？此操作不可恢复。`)) {
      return
    }
    
    try {
      setUpdating(true)
      setError(null)
      
      await adminTenantApi.deleteTenant(parseInt(id))
      
      // 删除成功后跳转到列表页
      navigate(ROUTES.admin.tenants, { 
        state: { message: '租户删除成功！' }
      })
    } catch (err: any) {
      console.error('删除租户失败:', err)
      setError(err.response?.data?.message || '删除租户失败')
    } finally {
      setUpdating(false)
    }
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

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '--'
    }
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const formatNumber = (value?: number | null) => {
    return new Intl.NumberFormat('zh-CN').format(value ?? 0)
  }

  if (loading) {
    return (
      <AdminLayout title="租户详情">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!tenant) {
    return (
      <AdminLayout title="租户详情">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">租户不存在</h3>
          <p className="mt-1 text-sm text-gray-500">请检查租户ID是否正确</p>
          <div className="mt-6">
            <PButton onClick={() => navigate(ROUTES.admin.tenants)}>
              返回租户列表
            </PButton>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={`租户详情 - ${tenant.name}`}>
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
                <div className="mt-1 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* 页面头部 */}
        <div className="lg:flex lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {tenant.name}
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
          <div className="mt-5 flex lg:mt-0 lg:ml-4 space-x-3">
            <PButton
              onClick={() => setEditMode(!editMode)}
              disabled={updating}
              variant="secondary"
            >
              <span className="inline-flex items-center">
                <PencilIcon className="h-4 w-4 mr-2" />
                {editMode ? '取消编辑' : '编辑'}
              </span>
            </PButton>
            <PButton
              onClick={handleDelete}
              disabled={updating}
              variant="danger"
            >
              <span className="inline-flex items-center">
                <TrashIcon className="h-4 w-4 mr-2" />
                删除
              </span>
            </PButton>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基本信息 */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-gray-400" />
                  基本信息
                </h3>
                
                {editMode ? (
                  <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                      <PInput
                        label="租户名称"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div>
                      <PTextarea
                        label="描述"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="租户描述信息..."
                      />
                    </div>

                    <div>
                      <PSelect
                        label="套餐"
                        name="plan"
                        value={formData.plan}
                        onChange={handleInputChange}
                      >
                        <option value="free">免费版</option>
                        <option value="basic">基础版</option>
                        <option value="premium">高级版</option>
                        <option value="enterprise">企业版</option>
                      </PSelect>
                    </div>

                    <div>
                      <PSelect
                        label="状态"
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">活跃</option>
                        <option value="suspended">暂停</option>
                        <option value="deleted">删除</option>
                      </PSelect>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <PButton
                        type="button"
                        variant="secondary"
                        onClick={() => setEditMode(false)}
                      >
                        取消
                      </PButton>
                      <PButton
                        type="submit"
                        loading={updating}
                      >
                        保存
                      </PButton>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">租户代码</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{tenant.code}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">描述</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {tenant.description || '暂无描述'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">所有者邮箱</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenant.owner_email}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">创建时间</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(tenant.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">更新时间</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(tenant.updated_at)}</dd>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 租户设置 */}
            <div className="bg-white shadow rounded-lg mt-6">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <CogIcon className="h-5 w-5 mr-2 text-gray-400" />
                  租户设置
                </h3>
                
                {editMode ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <PInput
                          label="最大用户数"
                          type="number"
                          value={formData.settings?.max_users || 0}
                          onChange={(e) => handleSettingChange('max_users', parseInt(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div>
                        <PInput
                          label="最大应用数"
                          type="number"
                          value={formData.settings?.max_apps || 0}
                          onChange={(e) => handleSettingChange('max_apps', parseInt(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div>
                        <PInput
                          label="最大存储 (MB)"
                          type="number"
                          value={formData.settings?.max_storage || 0}
                          onChange={(e) => handleSettingChange('max_storage', parseInt(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <PCheckbox
                        variant="switch"
                        label="启用 API 功能"
                        checked={formData.settings?.enable_api || false}
                        onChange={(e) => handleSettingChange('enable_api', (e.target as HTMLInputElement).checked)}
                      />
                      <PCheckbox
                        variant="switch"
                        label="启用 SSO 单点登录"
                        checked={formData.settings?.enable_sso || false}
                        onChange={(e) => handleSettingChange('enable_sso', (e.target as HTMLInputElement).checked)}
                      />
                      <PCheckbox
                        variant="switch"
                        label="启用审计日志"
                        checked={formData.settings?.enable_audit || false}
                        onChange={(e) => handleSettingChange('enable_audit', (e.target as HTMLInputElement).checked)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">最大用户数</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {tenant.settings?.max_users || 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">最大应用数</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {tenant.settings?.max_apps || 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">最大存储</dt>
                        <dd className="mt-1 text-lg font-semibold text-gray-900">
                          {tenant.settings?.max_storage || 0} MB
                        </dd>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">API 功能</dt>
                        <dd className="mt-1">
                          {tenant.settings?.enable_api ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-gray-400">未启用</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">SSO 单点登录</dt>
                        <dd className="mt-1">
                          {tenant.settings?.enable_sso ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-gray-400">未启用</span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500">审计日志</dt>
                        <dd className="mt-1">
                          {tenant.settings?.enable_audit ? (
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          ) : (
                            <span className="text-gray-400">未启用</span>
                          )}
                        </dd>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：统计信息 */}
          <div className="space-y-6">
            {/* 快速统计 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-gray-400" />
                  统计信息
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">用户数量</dt>
                    <dd className="mt-1 text-2xl font-semibold text-indigo-600">
                      {formatNumber(tenant.user_count)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">应用数量</dt>
                    <dd className="mt-1 text-2xl font-semibold text-purple-600">
                      {formatNumber(tenant.app_count)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">存储使用</dt>
                    <dd className="mt-1 text-2xl font-semibold text-green-600">
                      {formatNumber(tenant.stats?.storage_used)} MB
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">API 调用（本月）</dt>
                    <dd className="mt-1 text-2xl font-semibold text-blue-600">
                      {formatNumber(tenant.stats?.api_calls_this_month)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">最近活跃时间</dt>
                    <dd
                      className={`mt-1 text-lg font-semibold ${
                        tenant.stats?.last_active_at ? 'text-gray-700' : 'text-gray-400'
                      }`}
                    >
                      {tenant.stats?.last_active_at ? formatDate(tenant.stats.last_active_at) : '--'}
                    </dd>
                  </div>
                </div>
              </div>
            </div>

            {/* 应用列表 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
                  <CubeIcon className="h-5 w-5 mr-2 text-gray-400" />
                  应用列表
                </h3>
                {tenant.recent_apps && tenant.recent_apps.length > 0 ? (
                  <div className="space-y-3">
                    {tenant.recent_apps.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <CubeIcon className="h-6 w-6 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{app.name}</p>
                            <p className="text-xs text-gray-500">{app.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">创建于</p>
                          <p className="text-xs text-gray-900">{new Date(app.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    暂无应用
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default TenantDetail
