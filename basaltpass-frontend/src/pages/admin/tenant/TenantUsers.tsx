import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  UsersIcon,
  UserIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  PlusIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@components/AdminLayout'
import { adminTenantApi, AdminTenantDetailResponse, AdminTenantUser, AdminTenantUserListRequest } from '@api/admin/tenant'

// 类型定义
interface TenantUser extends AdminTenantUser {
  // 继承所有AdminTenantUser的属性
}

const TenantUsers: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<AdminTenantDetailResponse | null>(null)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [userType, setUserType] = useState<'all' | 'tenant_admin' | 'app_user'>('all')
  const [role, setRole] = useState('')

  useEffect(() => {
    if (id) {
      fetchTenantDetail()
      loadUsers()
    }
  }, [id, page, search, userType, role])

  const fetchTenantDetail = async () => {
    if (!id) return
    
    try {
      const response = await adminTenantApi.getTenantDetail(parseInt(id))
      setTenant(response)
    } catch (err: any) {
      console.error('获取租户详情失败:', err)
      setError(err.response?.data?.message || '获取租户详情失败')
    }
  }

  const loadUsers = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      
      const params: AdminTenantUserListRequest = {
        page,
        limit: 20,
        search: search || undefined,
        user_type: userType === 'all' ? undefined : userType,
        role: role || undefined
      }

      const response = await adminTenantApi.getTenantUsers(parseInt(id), params)
      setUsers(response.users)
      setTotalPages(response.pagination.total_pages)
    } catch (error) {
      console.error('Failed to load users:', error)
      setError('加载用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveUser = async (userId: number) => {
    if (!confirm('确定要移除这个用户吗？')) {
      return
    }

    if (!id) return

    try {
      await adminTenantApi.removeTenantUser(parseInt(id), userId)
      await loadUsers() // 重新加载用户列表
    } catch (error: any) {
      console.error('Failed to remove user:', error)
      const errorMessage = error.response?.data?.error || '移除用户失败'
      alert(errorMessage)
    }
  }

  const getRoleBadge = (role: string, userType: string) => {
    if (userType === 'tenant_admin') {
      switch (role) {
        case 'owner':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <StarIcon className="h-3 w-3 mr-1" />
              所有者
            </span>
          )
        case 'admin':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <ShieldCheckIcon className="h-3 w-3 mr-1" />
              管理员
            </span>
          )
        case 'member':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <UserIcon className="h-3 w-3 mr-1" />
              成员
            </span>
          )
        default:
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              {role}
            </span>
          )
      }
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          应用用户
        </span>
      )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            活跃
          </span>
        )
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            暂停
          </span>
        )
      case 'banned':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            封禁
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && !tenant) {
    return (
      <AdminLayout title="租户用户管理">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </AdminLayout>
    )
  }

  const actions = (
    <div className="flex space-x-3">
      <button
        onClick={() => {/* TODO: 实现添加用户功能 */}}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <PlusIcon className="h-4 w-4 mr-2" />
        添加用户
      </button>
    </div>
  )

  return (
    <AdminLayout title={`用户管理 - ${tenant?.name || '租户'}`} actions={actions}>
      <div className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
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
              <UsersIcon className="h-8 w-8 mr-3 text-indigo-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  用户管理
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  管理租户 "{tenant?.name}" 的用户
                </p>
              </div>
            </div>
          </div>
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
                  placeholder="搜索用户邮箱或昵称..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="sm:w-40">
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={userType}
                onChange={(e) => setUserType(e.target.value as any)}
              >
                <option value="all">所有用户</option>
                <option value="tenant_admin">租户管理员</option>
                <option value="app_user">应用用户</option>
              </select>
            </div>
            <div className="sm:w-32">
              <select
                className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">所有角色</option>
                <option value="owner">所有者</option>
                <option value="admin">管理员</option>
                <option value="member">成员</option>
              </select>
            </div>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {user.nickname || user.email}
                            </h3>
                            <div className="ml-3">
                              {getRoleBadge(user.role, user.user_type)}
                            </div>
                            <div className="ml-2">
                              {getStatusBadge(user.status)}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>邮箱: {user.email}</span>
                            {user.app_name && (
                              <>
                                <span className="mx-2">•</span>
                                <span>应用: {user.app_name}</span>
                              </>
                            )}
                            <span className="mx-2">•</span>
                            <span>加入时间: {formatDate(user.created_at)}</span>
                            {user.last_active_at && (
                              <>
                                <span className="mx-2">•</span>
                                <span>最后活跃: {formatDate(user.last_active_at)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {/* TODO: 查看用户详情 */}}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        title="查看详情"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {user.role !== 'owner' && (
                        <>
                          <button
                            onClick={() => {/* TODO: 编辑用户权限 */}}
                            className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            title="编辑权限"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            className="inline-flex items-center p-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            title="移除用户"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 空状态 */}
          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">暂无用户</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || userType !== 'all' || role ? '没有找到匹配的用户' : '该租户暂无用户'}
              </p>
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

export default TenantUsers
