import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  CubeIcon,
  KeyIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { appApi, App } from '../../api/app'
import TenantLayout from '../../components/TenantLayout'

export default function AppList() {
  const [apps, setApps] = useState<App[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadApps()
  }, [page])

  const loadApps = async () => {
    try {
      setLoading(true)
      const response = await appApi.listApps(page, 20)
      setApps(response.apps || [])
      setTotalPages(response.total_pages || 1)
    } catch (error) {
      console.error('Failed to load apps:', error)
      setError('加载应用列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteApp = async (id: string) => {
    if (!confirm('确定要删除这个应用吗？此操作不可撤销。')) {
      return
    }

    try {
      await appApi.deleteApp(id)
      await loadApps()
    } catch (error) {
      console.error('Failed to delete app:', error)
      alert('删除应用失败')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '运行中'
      case 'inactive':
        return '未激活'
      case 'suspended':
        return '已暂停'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
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
            管理你的 OAuth2 应用和服务
          </p>
        </div>
        <Link
          to="/tenant/apps/new"
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
                            <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                              <CubeIcon className="h-6 w-6 text-indigo-600" />
                            </div>
                          )}
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {app.name}
                            </h3>
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
                                  className="text-indigo-600 hover:text-indigo-800"
                                >
                                  {app.homepage_url}
                                </a>
                                <span className="mx-2">•</span>
                              </>
                            )}
                            <span>创建于 {new Date(app.created_at).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">回调地址：</span>
                              {app.callback_urls.length > 0 ? (
                                <span className="ml-1">
                                  {app.callback_urls.slice(0, 2).join(', ')}
                                  {app.callback_urls.length > 2 && ` (+${app.callback_urls.length - 2} 个)`}
                                </span>
                              ) : (
                                <span className="ml-1 text-gray-400">未配置</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/tenant/apps/${app.id}`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="查看详情"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/edit`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="编辑"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/tenant/apps/${app.id}/oauth`}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="OAuth配置"
                      >
                        <KeyIcon className="h-4 w-4" />
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
              <p className="mt-1 text-sm text-gray-500">开始创建第一个应用</p>
              <div className="mt-6">
                <Link
                  to="/tenant/apps/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  创建应用
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                上一页
              </button>
              <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </nav>
          </div>
        )}
      </div>
    </TenantLayout>
  )
}
