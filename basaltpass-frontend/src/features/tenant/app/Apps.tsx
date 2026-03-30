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
import { PSkeleton, PBadge, PAlert, PPageHeader, PEmptyState, PButton } from '@ui'

const actionButtonClass =
  'inline-flex items-center rounded-lg border p-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2'

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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'error'
      case 'pending': return 'warning'
      default: return 'default'
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
        <div className="py-6">
          <PSkeleton.Management />
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
              <PButton onClick={fetchApps}>重试</PButton>
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
        <PPageHeader
          title="应用管理"
          description="管理您租户下的应用和服务"
          icon={<CubeIcon className="h-8 w-8 text-blue-600" />}
          actions={
            <Link to={ROUTES.tenant.appsNew}>
              <PButton leftIcon={<PlusIcon className="h-4 w-4" />}>创建应用</PButton>
            </Link>
          }
        />

        {/* 错误提示 */}
        {error && <PAlert variant="error" message={error} className="mb-6" />}

        {/* 应用列表 */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
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
                            <PBadge variant={getStatusVariant(app.status) as any} className="ml-3">
                              {getStatusText(app.status)}
                            </PBadge>
                            {app.oauth_client && (
                              <PBadge variant="info" className="ml-2" icon={<KeyIcon className="h-3 w-3" />}>
                                OAuth已配置
                              </PBadge>
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
                                  站点主页
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
                        className={`${actionButtonClass} ${
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
                        className={`${actionButtonClass} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500`}
                        title="用户权限管理"
                      >
                        <UsersIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/roles`}
                        className={`${actionButtonClass} border-green-300 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500`}
                        title="角色管理"
                      >
                        <ShieldCheckIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title="查看详情"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/stats`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title="统计"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/settings`}
                        className={`${actionButtonClass} border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500`}
                        title="设置"
                      >
                        <Cog6ToothIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteApp(app.id)}
                        className={`${actionButtonClass} border-red-300 bg-white text-red-700 hover:bg-red-50 focus:ring-red-500`}
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
            <PEmptyState
              icon={CubeIcon}
              title="暂无应用"
              description="开始创建您的第一个应用"
            >
              <Link to={ROUTES.tenant.appsNew}>
                <PButton leftIcon={<PlusIcon className="h-4 w-4" />}>创建应用</PButton>
              </Link>
            </PEmptyState>
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
