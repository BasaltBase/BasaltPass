import { useEffect, useState } from 'react'
import { adminUserApi, type AdminUser, type UserListParams, type UserStats } from '@api/admin/user'
import { Link } from 'react-router-dom'
import { 
  ChevronRightIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  EyeIcon,
  UserGroupIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@components/AdminLayout'
import { PInput, PButton, PCheckbox } from '../../../components'

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  })
  
  // 查询参数
  const [params, setParams] = useState<UserListParams>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort_by: 'created_at',
    sort_order: 'desc'
  })

  // 创建用户相关状态
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    phone: '',
    password: '',
    nickname: '',
    email_verified: false,
    phone_verified: false
  })
  const [createError, setCreateError] = useState('')

  // 加载用户列表
  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await adminUserApi.getUsers(params)
      setUsers(response.users)
      setPagination(response.pagination)
    } catch (error) {
      console.error('加载用户列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 加载统计数据
  const loadStats = async () => {
    try {
      const stats = await adminUserApi.getUserStats()
      setStats(stats)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [params])

  useEffect(() => {
    loadStats()
  }, [])

  // 处理搜索
  const handleSearch = (search: string) => {
    setParams(prev => ({ ...prev, search, page: 1 }))
  }

  // 处理状态筛选
  const handleStatusFilter = (status: UserListParams['status']) => {
    setParams(prev => ({ ...prev, status, page: 1 }))
  }

  // 处理分页
  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }))
  }

  // 处理封禁用户
  const handleBanUser = async (user: AdminUser) => {
    try {
      await adminUserApi.banUser(user.id, {
        banned: !user.banned,
        reason: user.banned ? '解封用户' : '管理员操作'
      })
      loadUsers()
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  // 处理删除用户
  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`确定要删除用户 ${user.nickname || user.email} 吗？此操作不可恢复。`)) {
      return
    }
    
    try {
      await adminUserApi.deleteUser(user.id)
      loadUsers()
    } catch (error) {
      console.error('删除用户失败:', error)
    }
  }

  // 处理创建用户
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      setCreateError('邮箱和密码不能为空')
      return
    }

    try {
      setCreating(true)
      setCreateError('')
      await adminUserApi.createUser(createForm)
      setShowCreateModal(false)
      setCreateForm({
        email: '',
        phone: '',
        password: '',
        nickname: '',
        email_verified: false,
        phone_verified: false
      })
      loadUsers()
    } catch (error: any) {
      setCreateError(error.response?.data?.error || '创建用户失败')
    } finally {
      setCreating(false)
    }
  }

  // 格式化日期
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  // 获取状态样式
  const getStatusStyle = (user: AdminUser) => {
    if (user.banned) {
      return 'bg-red-100 text-red-800'
    }
    if (!user.email_verified && !user.phone_verified) {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-green-100 text-green-800'
  }

  // 获取状态文本
  const getStatusText = (user: AdminUser) => {
    if (user.banned) return '已封禁'
    if (!user.email_verified && !user.phone_verified) return '未验证'
    return '正常'
  }

  return (
    <AdminLayout title="用户管理">
      <div className="space-y-6">
        {/* 面包屑导航 */}
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/admin/dashboard" className="text-gray-400 hover:text-gray-500">
                仪表板
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRightIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                <span className="ml-4 text-sm font-medium text-gray-500">用户管理</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* 页面标题和描述 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理系统中的所有用户，包括查看、修改、封禁和删除操作
            </p>
          </div>
          <PButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            添加用户
          </PButton>
        </div>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UsersIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">总用户数</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.total_users}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{stats.active_users}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">被封禁</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.banned_users}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">本月新增</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.new_users_this_month}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* 搜索框 */}
              <div className="flex-1">
                <PInput
                  type="text"
                  placeholder="搜索用户（邮箱、电话、昵称）"
                  value={params.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                />
              </div>

              {/* 状态筛选 */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={params.status}
                  onChange={(e) => handleStatusFilter(e.target.value as UserListParams['status'])}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="all">全部状态</option>
                  <option value="active">活跃用户</option>
                  <option value="banned">已封禁</option>
                  <option value="verified">已验证</option>
                  <option value="unverified">未验证</option>
                </select>
              </div>
            </div>
          </div>

          {/* 用户列表 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    联系方式
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    租户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      加载中...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {user.avatar_url ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover"
                              src={user.avatar_url}
                              alt={user.nickname}
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                              <UsersIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.nickname || '未设置昵称'}
                            </div>
                            <div className="text-sm text-gray-500">ID: {user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                        {user.phone && (
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(user)}`}>
                            {getStatusText(user)}
                          </span>
                          <div className="flex gap-1">
                            {user.email_verified && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                邮箱已验证
                              </span>
                            )}
                            {user.two_fa_enabled && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                2FA
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.tenant_memberships.length > 0 ? (
                            <div className="space-y-1">
                              {user.tenant_memberships.slice(0, 2).map((membership) => (
                                <div key={membership.tenant_id} className="flex items-center gap-2">
                                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {membership.tenant_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({membership.role})
                                  </span>
                                </div>
                              ))}
                              {user.tenant_memberships.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{user.tenant_memberships.length - 2} 更多
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">无租户</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            to={`/admin/users/${user.id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="查看详情"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>
                          <PButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleBanUser(user)}
                            className={user.banned ? "text-green-600 hover:text-green-800" : "text-red-600 hover:text-red-800"}
                            title={user.banned ? "解封用户" : "封禁用户"}
                          >
                            {user.banned ? (
                              <ShieldCheckIcon className="h-4 w-4" />
                            ) : (
                              <ShieldExclamationIcon className="h-4 w-4" />
                            )}
                          </PButton>
                          <PButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-600 hover:text-red-800"
                            title="删除用户"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </PButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {!loading && pagination.total_pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <PButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  上一页
                </PButton>
                <PButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                >
                  下一页
                </PButton>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    显示第 <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> 到{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    条，共 <span className="font-medium">{pagination.total}</span> 条记录
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <PButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      className="rounded-l-md rounded-r-none"
                    >
                      上一页
                    </PButton>
                    
                    {/* 页码按钮 */}
                    {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                      let page;
                      if (pagination.total_pages <= 5) {
                        page = i + 1;
                      } else if (pagination.page <= 3) {
                        page = i + 1;
                      } else if (pagination.page >= pagination.total_pages - 2) {
                        page = pagination.total_pages - 4 + i;
                      } else {
                        page = pagination.page - 2 + i;
                      }
                      
                      return (
                        <PButton
                          key={page}
                          variant={page === pagination.page ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="rounded-none"
                        >
                          {page}
                        </PButton>
                      );
                    })}
                    
                    <PButton
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.total_pages}
                      className="rounded-r-md rounded-l-none"
                    >
                      下一页
                    </PButton>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 创建用户模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
            <div className="w-3/4 max-w-2xl p-6 border shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">创建新用户</h2>
                <PButton 
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError('')
                    setCreateForm({
                      email: '',
                      phone: '',
                      password: '',
                      nickname: '',
                      email_verified: false,
                      phone_verified: false
                    })
                  }}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ✕
                </PButton>
              </div>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} className="space-y-6">
                {/* 第一行：邮箱和手机号 */}
                <div className="grid grid-cols-2 gap-6">
                  <PInput
                    type="email"
                    label={<>邮箱 <span className="text-red-500">*</span></>}
                    placeholder="输入邮箱地址"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  <PInput
                    type="tel"
                    label="手机号"
                    placeholder="输入手机号"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                {/* 第二行：密码和昵称 */}
                <div className="grid grid-cols-2 gap-6">
                  <PInput
                    type="password"
                    label={<>密码 <span className="text-red-500">*</span></>}
                    placeholder="输入密码（至少6位）"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                  <PInput
                    type="text"
                    label="昵称"
                    placeholder="输入用户昵称"
                    value={createForm.nickname}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nickname: e.target.value }))}
                  />
                </div>

                {/* 第三行：验证状态 */}
                <div className="grid grid-cols-2 gap-6">
                  <PCheckbox
                    label="邮箱已验证"
                    checked={createForm.email_verified}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email_verified: e.target.checked }))}
                  />
                  <PCheckbox
                    label="手机已验证"
                    checked={createForm.phone_verified}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone_verified: e.target.checked }))}
                  />
                </div>

                {/* 错误信息显示 */}
                {createError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {createError}
                  </div>
                )}

                {/* 按钮区域 */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateModal(false)
                      setCreateError('')
                      setCreateForm({
                        email: '',
                        phone: '',
                        password: '',
                        nickname: '',
                        email_verified: false,
                        phone_verified: false
                      })
                    }}
                  >
                    取消
                  </PButton>
                  <PButton
                    type="submit"
                    disabled={creating}
                    variant="primary"
                    loading={creating}
                  >
                    创建用户
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
} 