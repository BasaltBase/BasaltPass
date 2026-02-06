import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  ArrowLeftIcon, 
  CubeIcon, 
  KeyIcon, 
  UsersIcon, 
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  UserGroupIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi, TenantApp } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'

export default function AppDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [app, setApp] = useState<TenantApp | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showClientSecret, setShowClientSecret] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

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
      setApp(response.data)
    } catch (err: any) {
      console.error('获取应用详情失败:', err)
      setError(err.response?.data?.error || '获取应用详情失败')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('复制失败:', err)
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
      <TenantLayout title="应用详情">
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
      <TenantLayout title="应用详情">
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
      <TenantLayout title="应用详情">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">应用不存在</h3>
            <div className="mt-6">
              <Link
                to={ROUTES.tenant.apps}
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
    <TenantLayout title={`${app.name} - 应用详情`}>
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <button
          onClick={() => navigate(ROUTES.tenant.apps)}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          返回应用列表
        </button>

        {/* 页面头部 */}
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {app.logo_url ? (
                <img
                  className="h-16 w-16 rounded-lg object-cover"
                  src={app.logo_url}
                  alt={app.name}
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-200 flex items-center justify-center">
                  <CubeIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
            </div>
            <div className="ml-6">
              <div className="flex items-center">
                <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
                <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeColor(app.status)}`}>
                  {getStatusText(app.status)}
                </span>
              </div>
              {app.description && (
                <p className="mt-2 text-lg text-gray-600">{app.description}</p>
              )}
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>创建于 {new Date(app.created_at).toLocaleDateString()}</span>
                <span>•</span>
                <span>应用ID: {app.id}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to={`/tenant/apps/${app.id}/stats`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ChartBarIcon className="h-4 w-4 mr-2" />
              统计
            </Link>
            <Link
              to={`/tenant/apps/${app.id}/settings`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              设置
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总用户数</dt>
                    <dd className="text-lg font-medium text-gray-900">{app.stats?.total_users || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">活跃用户</dt>
                    <dd className="text-lg font-medium text-gray-900">{app.stats?.active_users || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">今日请求</dt>
                    <dd className="text-lg font-medium text-gray-900">{app.stats?.requests_today || 0}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 权限控制中心 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="px-6 py-4 border-b border-blue-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-600" />
              权限控制中心
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              管理应用的用户权限、角色分配和访问控制
            </p>
          </div>
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 用户管理 */}
              <Link
                to={`/tenant/apps/${app.id}/users`}
                className="group relative bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserGroupIcon className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 group-hover:text-blue-900">
                        用户管理
                      </h4>
                      <p className="text-sm text-gray-500">
                        管理用户访问权限
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {app.stats?.total_users || 0} 用户
                  </span>
                </div>
              </Link>

              {/* 角色管理 */}
              <Link
                to={`/tenant/apps/${app.id}/roles`}
                className="group relative bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-green-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShieldCheckIcon className="h-8 w-8 text-green-600 group-hover:text-green-700" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 group-hover:text-green-900">
                        角色管理
                      </h4>
                      <p className="text-sm text-gray-500">
                        创建和配置用户角色
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    角色与权限
                  </span>
                </div>
              </Link>

              {/* 权限管理 */}
              <Link
                to={`/tenant/apps/${app.id}/permissions`}
                className="group relative bg-white rounded-lg p-6 border-2 border-gray-200 hover:border-purple-300 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <LockClosedIcon className="h-8 w-8 text-purple-600 group-hover:text-purple-700" />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900 group-hover:text-purple-900">
                        权限管理
                      </h4>
                      <p className="text-sm text-gray-500">
                        定义和分类权限
                      </p>
                    </div>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                    权限配置
                  </span>
                </div>
              </Link>
            </div>

            {/* 快速操作 */}
            <div className="mt-6 pt-4 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">快速开始</h4>
                  <p className="text-xs text-gray-600 mt-1">
                    为新应用快速设置权限体系
                  </p>
                </div>
                <div className="flex space-x-3">
                  <Link
                    to={`/tenant/apps/${app.id}/permissions`}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 transition-colors"
                  >
                    创建权限
                  </Link>
                  <Link
                    to={`/tenant/apps/${app.id}/roles`}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    创建角色
                  </Link>
                  <Link
                    to={`/tenant/apps/${app.id}/users`}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    分配权限
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 应用信息 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CubeIcon className="h-5 w-5 mr-2 text-blue-500" />
              应用信息
            </h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">应用名称</label>
                <p className="mt-1 text-sm text-gray-900">{app.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">状态</label>
                <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(app.status)}`}>
                  {getStatusText(app.status)}
                </span>
              </div>
              {app.homepage_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">主页地址</label>
                  <a
                    href={app.homepage_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    {app.homepage_url}
                  </a>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">创建时间</label>
                <p className="mt-1 text-sm text-gray-900">{new Date(app.created_at).toLocaleString()}</p>
              </div>
            </div>
            {app.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">应用描述</label>
                <p className="mt-1 text-sm text-gray-900">{app.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* OAuth配置 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-green-500" />
              OAuth配置
            </h3>
          </div>
          <div className="px-6 py-4 space-y-4">
            {/* 客户端ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700">客户端ID</label>
              <div className="mt-1 flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono">
                  app_{app.id}_client
                </code>
                <button
                  onClick={() => copyToClipboard(`app_${app.id}_client`, 'clientId')}
                  className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:text-gray-700"
                >
                  {copiedField === 'clientId' ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 客户端密钥 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">客户端密钥</label>
              <div className="mt-1 flex items-center space-x-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono">
                  {showClientSecret ? `secret_${app.id}_${Date.now()}` : '••••••••••••••••••••••••••••••••'}
                </code>
                <button
                  onClick={() => setShowClientSecret(!showClientSecret)}
                  className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:text-gray-700"
                >
                  {showClientSecret ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => copyToClipboard(`secret_${app.id}_${Date.now()}`, 'clientSecret')}
                  className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:text-gray-700"
                >
                  {copiedField === 'clientSecret' ? (
                    <CheckIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 回调地址 */}
            <div>
              <label className="block text-sm font-medium text-gray-700">授权回调地址</label>
              <div className="mt-1 space-y-2">
                {(app.callback_urls || []).map((url, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm font-mono">
                      {url}
                    </code>
                    <button
                      onClick={() => copyToClipboard(url, `callback_${index}`)}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-500 hover:text-gray-700"
                    >
                      {copiedField === `callback_${index}` ? (
                        <CheckIcon className="h-4 w-4 text-green-500" />
                      ) : (
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
