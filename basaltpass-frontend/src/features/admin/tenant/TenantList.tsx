import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  EyeIcon, 
  PencilIcon, 
  TrashIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CogIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminTenantApi, AdminTenantResponse, AdminTenantListRequest } from '@api/admin/tenant'

export default function TenantList() {
  const [tenants, setTenants] = useState<AdminTenantResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')

  useEffect(() => {
    loadTenants()
  }, [page, search, status, plan])

  const loadTenants = async () => {
    try {
      setLoading(true)
      const params: AdminTenantListRequest = {
        page,
        limit: 20,
        search: search || undefined,
        status: status || undefined,
        plan: plan || undefined,
      }
      const response = await adminTenantApi.getTenantList(params)
      setTenants(response.tenants)
      setTotalPages(response.pagination.total_pages)
    } catch (error) {
      console.error('Failed to load tenants:', error)
      setError('加载租户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTenant = async (id: number) => {
    if (!confirm('确定要删除这个租户吗？此操作不可撤销。')) {
      return
    }

    try {
      await adminTenantApi.deleteTenant(id)
      await loadTenants()
    } catch (error) {
      console.error('Failed to delete tenant:', error)
      alert('删除租户失败')
    }
  }

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 text-gray-800'
      case 'pro':
        return 'bg-blue-100 text-blue-800'
      case 'enterprise':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      case 'deleted':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'free':
        return '免费版'
      case 'pro':
        return '专业版'
      case 'enterprise':
        return '企业版'
      default:
        return plan
    }
  }

  const getStatusDisplayName = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'suspended':
        return '暂停'
      case 'deleted':
        return '已删除'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <AdminLayout title="租户管理">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  const actions = (
    <Link
      to="/admin/tenants/create"
      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
    >
      <PlusIcon className="h-4 w-4 mr-2" />
      创建租户
    </Link>
  )

  return (
    <AdminLayout title="租户管理" actions={actions}>
      <div className="space-y-6">
        {/* 页面头部 */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 mr-3 text-indigo-600" />
            租户管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            管理平台上的所有租户
          </p>
        </div>

        {/* 搜索和过滤 */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="搜索租户名称、代码或描述..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-32">
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">所有状态</option>
                <option value="active">活跃</option>
                <option value="suspended">暂停</option>
                <option value="deleted">已删除</option>
              </select>
            </div>
            <div className="sm:w-32">
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option value="">所有套餐</option>
                <option value="free">免费版</option>
                <option value="pro">专业版</option>
                <option value="enterprise">企业版</option>
              </select>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* 租户列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <li key={tenant.id}>
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <BuildingOfficeIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {tenant.name}
                          </h3>
                          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(tenant.plan)}`}>
                            {getPlanDisplayName(tenant.plan)}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(tenant.status)}`}>
                            {getStatusDisplayName(tenant.status)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500">
                          <span>代码: {tenant.code}</span>
                          <span className="mx-2">•</span>
                          <span>所有者: {tenant.owner_name || tenant.owner_email}</span>
                          <span className="mx-2">•</span>
                          <span>用户: {tenant.user_count}</span>
                          <span className="mx-2">•</span>
                          <span>应用: {tenant.app_count}</span>
                          <span className="mx-2">•</span>
                          <span>创建于 {new Date(tenant.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/admin/tenants/${tenant.id}`}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="查看详情"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/admin/tenants/${tenant.id}/edit`}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="编辑"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/admin/tenants/${tenant.id}/users`}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="用户管理"
                    >
                      <UsersIcon className="h-4 w-4" />
                    </Link>
                    <Link
                      to={`/platform/tenants/${tenant.id}/settings`}
                      className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      title="设置"
                    >
                      <CogIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteTenant(tenant.id)}
                      className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="删除"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* 空状态 */}
          {tenants.length === 0 && !loading && (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无租户</h3>
              <p className="mt-1 text-sm text-gray-500">开始创建第一个租户</p>
              <div className="mt-6">
                <Link
                  to="/admin/tenants/create"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  创建租户
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center">
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
    </AdminLayout>
  )
}
