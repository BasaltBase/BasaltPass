import { useState, useEffect } from 'react'
import { 
  BuildingOffice2Icon,
  CubeIcon,
  UsersIcon,
  KeyIcon,
  CpuChipIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '../../components/TenantLayout'
import { tenantApi, TenantInfo } from '../../api/tenant'

export default function TenantInfoPage() {
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    fetchTenantInfo()
  }, [])

  const fetchTenantInfo = async () => {
    try {
      setLoading(true)
      const response = await tenantApi.getTenantInfo()
      setTenantInfo(response.data)
    } catch (err: any) {
      console.error('获取租户信息失败:', err)
      setError(err.response?.data?.error || '获取租户信息失败')
      
      // 如果获取租户信息失败，尝试获取调试信息
      try {
        const debugResponse = await tenantApi.debugUserStatus()
        setDebugInfo(debugResponse)
      } catch (debugErr) {
        console.error('获取调试信息失败:', debugErr)
      }
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN')
  }

  const getPlanDisplayName = (plan: string) => {
    const planNames = {
      free: '免费版',
      pro: '专业版',
      enterprise: '企业版'
    }
    return planNames[plan as keyof typeof planNames] || plan
  }

  const getPlanColor = (plan: string) => {
    const planColors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800'
    }
    return planColors[plan as keyof typeof planColors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const statusColors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      deleted: 'bg-red-100 text-red-800'
    }
    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusDisplayName = (status: string) => {
    const statusNames = {
      active: '正常',
      suspended: '暂停',
      deleted: '已删除'
    }
    return statusNames[status as keyof typeof statusNames] || status
  }

  if (loading) {
    return (
      <TenantLayout title="租户信息">
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title="租户信息">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-2xl">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            
            {/* 调试信息 */}
            {debugInfo && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
                <h4 className="text-sm font-medium text-gray-700 mb-2">调试信息:</h4>
                <div className="text-xs text-gray-600 space-y-1">
                  <div>用户ID: {debugInfo.user_id}</div>
                  <div>租户ID: {debugInfo.tenant_id || '未设置'}</div>
                  <div>用户邮箱: {debugInfo.user?.email}</div>
                  <div>是否超级管理员: {debugInfo.user?.is_super_admin ? '是' : '否'}</div>
                  <div>租户关联数量: {debugInfo.tenant_associations?.length || 0}</div>
                  {debugInfo.tenant_associations?.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">租户关联:</div>
                      {debugInfo.tenant_associations.map((ta: any, index: number) => (
                        <div key={index} className="ml-2">
                          - {ta.Tenant?.name} (角色: {ta.Role})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={fetchTenantInfo}
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

  if (!tenantInfo) {
    return (
      <TenantLayout title="租户信息">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">未找到租户信息</h3>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title="租户信息">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center">
            <BuildingOffice2Icon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">租户信息</h1>
              <p className="mt-1 text-sm text-gray-500">
                查看您的租户的基础信息和统计数据
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 基础信息 */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">基础信息</h3>
              </div>
              <div className="px-6 py-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">租户名称</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-semibold">{tenantInfo.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">租户代码</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">{tenantInfo.code}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">套餐类型</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanColor(tenantInfo.plan)}`}>
                        {getPlanDisplayName(tenantInfo.plan)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">状态</dt>
                    <dd className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenantInfo.status)}`}>
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        {getStatusDisplayName(tenantInfo.status)}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">创建时间</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(tenantInfo.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">更新时间</dt>
                    <dd className="mt-1 text-sm text-gray-900 flex items-center">
                      <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(tenantInfo.updated_at)}
                    </dd>
                  </div>
                  {tenantInfo.description && (
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">描述</dt>
                      <dd className="mt-1 text-sm text-gray-900">{tenantInfo.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>

          {/* 统计信息 */}
          <div className="space-y-6">
            {/* 使用统计 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">使用统计</h3>
              </div>
              <div className="px-6 py-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <UsersIcon className="h-5 w-5 text-blue-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">用户数量</span>
                    </div>
                    <span className="text-lg font-semibold text-blue-600">
                      {tenantInfo.stats.total_users}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CubeIcon className="h-5 w-5 text-green-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">应用总数</span>
                    </div>
                    <span className="text-lg font-semibold text-green-600">
                      {tenantInfo.stats.total_apps}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">活跃应用</span>
                    </div>
                    <span className="text-lg font-semibold text-emerald-600">
                      {tenantInfo.stats.active_apps}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <KeyIcon className="h-5 w-5 text-purple-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">OAuth客户端</span>
                    </div>
                    <span className="text-lg font-semibold text-purple-600">
                      {tenantInfo.stats.total_clients}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CpuChipIcon className="h-5 w-5 text-orange-500 mr-2" />
                      <span className="text-sm font-medium text-gray-700">活跃令牌</span>
                    </div>
                    <span className="text-lg font-semibold text-orange-600">
                      {tenantInfo.stats.active_tokens}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 配额信息 */}
            {tenantInfo.quota && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">配额限制</h3>
                </div>
                <div className="px-6 py-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">应用数量</span>
                        <span className="text-gray-500">
                          {tenantInfo.stats.total_apps} / {tenantInfo.quota.max_apps}
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((tenantInfo.stats.total_apps / tenantInfo.quota.max_apps) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">用户数量</span>
                        <span className="text-gray-500">
                          {tenantInfo.stats.total_users} / {tenantInfo.quota.max_users}
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min((tenantInfo.stats.total_users / tenantInfo.quota.max_users) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">每小时令牌限制</span>
                        <span className="text-sm text-gray-500">
                          {tenantInfo.quota.max_tokens_per_hour.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
