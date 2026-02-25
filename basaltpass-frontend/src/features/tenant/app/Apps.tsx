import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CubeIcon,
  KeyIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  UsersIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi, TenantApp } from '@api/tenant/tenantApp'
import { ROUTES } from '@constants'

export default function TenantAppList() {
  const [apps, setApps] = useState<TenantApp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchApps()
  }, [])

  const fetchApps = async () => {
    try {
      setLoading(true)
      const response = await tenantAppApi.listTenantApps()
      setApps(response.data?.apps || [])
    } catch (err: any) {
      console.error('获取应用列表失败:', err)
      setError(err.response?.data?.error || '获取应用列表失败')
    } finally {
      setLoading(false)
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
        return '运行中'
      case 'inactive':
        return '已停止'
      case 'pending':
        return '待激活'
      case 'deleted':
        return '已删除'
      default:
        return '未知'
    }
  }

  const handleToggleStatus = async (appId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      await tenantAppApi.toggleAppStatus(appId, newStatus)
      // 重新获取应用列表
      fetchApps()
    } catch (err: any) {
      console.error('切换应用状态失败:', err)
      uiAlert('切换应用状态失败，请重试')
    }
  }

  const handleDeleteApp = async (appId: string) => {
    if (await uiConfirm('确定要删除这个应用吗？此操作不可恢复。')) {
      try {
        await tenantAppApi.deleteTenantApp(appId)
        // 重新获取应用列表
        fetchApps()
      } catch (err: any) {
        console.error('删除应用失败:', err)
        uiAlert('删除应用失败，请重试')
      }
    }
  }

  if (loading) {
    return (
      <TenantLayout title="应用管理">
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
      <TenantLayout title="应用管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <button
                onClick={fetchApps}
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

  return (
    <TenantLayout title="应用管理">
      <div className="space-y-6">
        {/* 页面头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <CubeIcon className="h-8 w-8 mr-3 text-blue-600" />
              应用管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理您租户下的应用和服务
            </p>
          </div>
          <Link 
            to={ROUTES.tenant.appsNew} 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            创建应用
          </Link>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 应用列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {apps.map((app) => (
              <li key={app.id}>
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {app.logo_url ? (
                            <img
                              className="h-10 w-10 rounded-lg object-cover"
                              src={app.logo_url}
                              alt={app.name}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <CubeIcon className="h-6 w-6 text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <Link
                              to={`/tenant/apps/${app.id}`}
                              className="text-lg font-medium text-gray-900 hover:text-blue-600 truncate"
                            >
                              {app.name}
                            </Link>
                            <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(app.status)}`}>
                              {getStatusText(app.status)}
                            </span>
                            {app.oauth_client && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <KeyIcon className="h-3 w-3 mr-1" />
                                OAuth已配置
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <p className="text-sm text-gray-600 truncate">
                              {app.description}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500">
                            {app.homepage_url && (
                              <>
                                <a
                                  href={app.homepage_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {app.homepage_url}
                                </a>
                                <span className="mx-2">•</span>
                              </>
                            )}
                            <span>创建于 {new Date(app.created_at).toLocaleDateString()}</span>
                            {app.last_accessed && (
                              <>
                                <span className="mx-2">•</span>
                                <span>最后访问 {new Date(app.last_accessed).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>总用户: <span className="font-medium text-gray-900">{app.stats?.total_users || 0}</span></span>
                              <span>活跃用户: <span className="font-medium text-green-600">{app.stats?.active_users || 0}</span></span>
                              <span>今日请求: <span className="font-medium text-blue-600">{app.stats?.requests_today || 0}</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleStatus(app.id, app.status)}
                        className={`inline-flex items-center p-2 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          app.status === 'active'
                            ? 'border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500'
                            : 'border-green-300 text-green-700 bg-white hover:bg-green-50 focus:ring-green-500'
                        }`}
                        title={app.status === 'active' ? '停止应用' : '启动应用'}
                      >
                        {app.status === 'active' ? (
                          <StopIcon className="h-4 w-4" />
                        ) : (
                          <PlayIcon className="h-4 w-4" />
                        )}
                      </button>
                      <Link
                        to={`/tenant/apps/${app.id}/users`}
                        className="inline-flex items-center p-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="用户权限管理"
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/roles`}
                        className="inline-flex items-center p-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        title="角色管理"
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="查看详情"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/stats`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="统计"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/settings`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="设置"
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="删除"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* 空状态 */}
          {apps.length === 0 && !loading && (
            <div className="text-center py-12">
              <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无应用</h3>
              <p className="mt-1 text-sm text-gray-500">
                开始创建您的第一个应用
              </p>
              <div className="mt-6">
                <Link 
                  to={ROUTES.tenant.appsNew} 
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  创建应用
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 分页 - 如果需要的话 */}
        {apps.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                上一页
              </button>
              <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                下一页
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示 <span className="font-medium">1</span> 到 <span className="font-medium">{apps.length}</span> 共 <span className="font-medium">{apps.length}</span> 个应用
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
