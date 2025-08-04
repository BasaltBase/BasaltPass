import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  UsersIcon,
  CubeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ClockIcon,
  ShieldExclamationIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@components/TenantLayout'
import { tenantAppApi } from '@api/tenantApp'
import { appUserApi, type AppUserStats } from '@api/appUser'

interface AppWithUserStats {
  id: string
  name: string
  description: string
  status: string
  logo_url?: string
  userStats: AppUserStats
}

export default function TenantUserManagement() {
  const [apps, setApps] = useState<AppWithUserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetchAppsWithUserStats()
  }, [])

  const fetchAppsWithUserStats = async () => {
    try {
      setLoading(true)
      
      // 获取租户应用列表
      const appsResponse = await tenantAppApi.listTenantApps()
      const appsList = appsResponse.data?.apps || []

      // 并行获取每个应用的用户统计
      const appsWithStats = await Promise.all(
        appsList.map(async (app: any) => {
          try {
            const statsResponse = await appUserApi.getAppUserStats(app.id)
            return {
              ...app,
              userStats: statsResponse.stats || {
                total_users: 0,
                active_users: 0,
                new_users: 0
              }
            }
          } catch (err) {
            console.error(`获取应用 ${app.id} 用户统计失败:`, err)
            return {
              ...app,
              userStats: {
                total_users: 0,
                active_users: 0,
                new_users: 0
              }
            }
          }
        })
      )

      setApps(appsWithStats)
    } catch (err: any) {
      console.error('获取应用列表失败:', err)
      setError(err.response?.data?.error || '获取应用列表失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
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
      default:
        return '未知'
    }
  }

  const filteredApps = apps.filter(app => {
    const matchesSearch = searchTerm === '' || 
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || app.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // 计算总体统计
  const totalStats = apps.reduce((acc, app) => ({
    totalUsers: acc.totalUsers + app.userStats.total_users,
    activeUsers: acc.activeUsers + app.userStats.active_users,
    newUsers: acc.newUsers + app.userStats.new_users,
    totalApps: apps.length,
    activeApps: apps.filter(app => app.status === 'active').length
  }), { totalUsers: 0, activeUsers: 0, newUsers: 0, totalApps: 0, activeApps: 0 })

  if (loading) {
    return (
      <TenantLayout title="用户管理">
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
      <TenantLayout title="用户管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <button
                onClick={() => {
                  setError('')
                  fetchAppsWithUserStats()
                }}
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
    <TenantLayout title="用户管理">
      <div className="space-y-6">
        {/* 页面头部 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="h-8 w-8 mr-3 text-blue-600" />
            用户管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            管理租户下所有应用的用户访问权限
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总用户数</dt>
                    <dd className="text-lg font-medium text-gray-900">{totalStats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">活跃用户</dt>
                    <dd className="text-lg font-medium text-gray-900">{totalStats.activeUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">新用户</dt>
                    <dd className="text-lg font-medium text-gray-900">{totalStats.newUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CubeIcon className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总应用数</dt>
                    <dd className="text-lg font-medium text-gray-900">{totalStats.totalApps}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">运行应用</dt>
                    <dd className="text-lg font-medium text-gray-900">{totalStats.activeApps}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索应用名称或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有状态</option>
                  <option value="active">运行中</option>
                  <option value="inactive">已停止</option>
                  <option value="pending">待激活</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 应用列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                应用用户管理
              </h3>
            </div>

            {filteredApps.length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无应用</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? '未找到匹配的应用' : '还没有创建任何应用'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <Link
                      to="/tenant/apps/new"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      创建应用
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        应用
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        总用户数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        活跃用户
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        新用户
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredApps.map((app) => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
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
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {app.name}
                              </div>
                              <div className="text-sm text-gray-500 max-w-xs truncate">
                                {app.description}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                            {getStatusText(app.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <UsersIcon className="h-4 w-4 text-gray-400 mr-1" />
                            {app.userStats.total_users}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <CheckCircleIcon className="h-4 w-4 text-green-400 mr-1" />
                            {app.userStats.active_users}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 text-yellow-400 mr-1" />
                            {app.userStats.new_users}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/tenant/apps/${app.id}/users`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                          >
                            <EyeIcon className="h-4 w-4 mr-1" />
                            管理用户
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
