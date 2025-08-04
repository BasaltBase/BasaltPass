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
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserPlusIcon,
  EnvelopeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@components/TenantLayout'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { appUserApi, type AppUserStats } from '@api/tenant/appUser'
import { 
  tenantUserManagementApi, 
  type TenantUser, 
  type TenantUserStats,
  type UpdateTenantUserRequest,
  type InviteTenantUserRequest
} from '@api/tenant/tenantUserManagement'

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
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [tenantUserStats, setTenantUserStats] = useState<TenantUserStats>({
    total_users: 0,
    active_users: 0,
    suspended_users: 0,
    new_users_this_month: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'apps' | 'users'>('users')
  
  // 模态框状态
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 表单数据
  const [inviteFormData, setInviteFormData] = useState<InviteTenantUserRequest>({
    email: '',
    role: 'member',
    message: ''
  })
  
  const [editFormData, setEditFormData] = useState<UpdateTenantUserRequest>({
    role: 'member',
    status: 'active'
  })

  // 分页状态
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  // 消息提示
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    visible: boolean;
  }>({
    type: 'info',
    text: '',
    visible: false,
  })

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text, visible: true });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  }

  useEffect(() => {
    if (activeTab === 'users') {
      fetchTenantUsers()
      fetchTenantUserStats()
    } else {
      fetchAppsWithUserStats()
    }
  }, [activeTab, searchTerm, statusFilter, roleFilter])

  const fetchTenantUsers = async (page = 1, pageSize = 20) => {
    try {
      setLoading(true)
      const response = await tenantUserManagementApi.getTenantUsers({
        page,
        limit: pageSize,
        search: searchTerm,
        role: roleFilter,
        status: statusFilter
      })
      setTenantUsers(response.users || [])
      setPagination({
        current: page,
        pageSize,
        total: response.pagination?.total || 0,
      })
    } catch (err: any) {
      console.error('获取租户用户列表失败:', err)
      setError(err.response?.data?.error || '获取租户用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchTenantUserStats = async () => {
    try {
      const response = await tenantUserManagementApi.getTenantUserStats()
      setTenantUserStats(response.stats || {
        total_users: 0,
        active_users: 0,
        suspended_users: 0,
        new_users_this_month: 0
      })
    } catch (err: any) {
      console.error('获取租户用户统计失败:', err)
    }
  }

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
        return 'bg-yellow-100 text-yellow-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '活跃'
      case 'inactive':
        return '非活跃'
      case 'suspended':
        return '已暂停'
      case 'pending':
        return '待激活'
      default:
        return '未知'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner':
        return '所有者'
      case 'admin':
        return '管理员'
      case 'member':
        return '成员'
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

  const filteredTenantUsers = tenantUsers.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nickname.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || user.status === statusFilter
    const matchesRole = roleFilter === '' || user.role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
  })

  // 处理邀请用户
  const handleInviteUser = async () => {
    try {
      setSubmitting(true)
      await tenantUserManagementApi.inviteTenantUser(inviteFormData)
      showMessage('success', '邀请发送成功')
      setShowInviteModal(false)
      setInviteFormData({ email: '', role: 'member', message: '' })
      fetchTenantUsers()
      fetchTenantUserStats()
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || '邀请发送失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 处理编辑用户
  const handleEditUser = (user: TenantUser) => {
    setEditingUser(user)
    setEditFormData({
      role: user.role === 'owner' ? 'admin' : user.role as 'admin' | 'member',
      status: user.status
    })
    setShowEditModal(true)
  }

  // 处理更新用户
  const handleUpdateUser = async () => {
    if (!editingUser) return
    
    try {
      setSubmitting(true)
      await tenantUserManagementApi.updateTenantUser(editingUser.id, editFormData)
      showMessage('success', '用户信息更新成功')
      setShowEditModal(false)
      setEditingUser(null)
      fetchTenantUsers()
      fetchTenantUserStats()
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || '用户信息更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 处理删除用户
  const handleRemoveUser = async (user: TenantUser) => {
    if (user.role === 'owner') {
      showMessage('error', '不能移除租户所有者')
      return
    }

    if (!confirm(`确定要移除用户"${user.nickname || user.email}"吗？`)) {
      return
    }

    try {
      await tenantUserManagementApi.removeTenantUser(user.id)
      showMessage('success', '用户移除成功')
      fetchTenantUsers()
      fetchTenantUserStats()
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || '用户移除失败')
    }
  }

  // 处理重新发送邀请
  const handleResendInvitation = async (user: TenantUser) => {
    try {
      await tenantUserManagementApi.resendInvitation(user.id)
      showMessage('success', '邀请已重新发送')
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || '重新发送邀请失败')
    }
  }

  // 分页变化
  const handlePageChange = (page: number) => {
    fetchTenantUsers(page, pagination.pageSize)
  }

  // 计算总体统计
  const appStats = apps.reduce((acc, app) => ({
    totalUsers: acc.totalUsers + app.userStats.total_users,
    activeUsers: acc.activeUsers + app.userStats.active_users,
    newUsers: acc.newUsers + app.userStats.new_users,
    totalApps: apps.length,
    activeApps: apps.filter(app => app.status === 'active').length
  }), { totalUsers: 0, activeUsers: 0, newUsers: 0, totalApps: 0, activeApps: 0 })

  const userStats = {
    totalUsers: tenantUserStats.total_users,
    activeUsers: tenantUserStats.active_users,
    suspendedUsers: tenantUserStats.suspended_users,
    newUsers: tenantUserStats.new_users_this_month
  }

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
        {/* 消息提示 */}
        {message.visible && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-500 text-white' :
            message.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {message.type === 'success' && <CheckCircleIcon className="w-5 h-5" />}
            {message.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5" />}
            <span>{message.text}</span>
            <button 
              onClick={() => setMessage(prev => ({ ...prev, visible: false }))}
              className="ml-2 hover:opacity-75"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 页面头部 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <UsersIcon className="h-8 w-8 mr-3 text-blue-600" />
              用户管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理租户用户和应用用户权限
            </p>
          </div>
          {activeTab === 'users' && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <UserPlusIcon className="w-5 h-5" />
                <span>邀请用户</span>
              </button>
            </div>
          )}
        </div>

        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UsersIcon className="w-5 h-5 inline mr-2" />
              租户用户
            </button>
            <button
              onClick={() => setActiveTab('apps')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'apps'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CubeIcon className="w-5 h-5 inline mr-2" />
              应用用户管理
            </button>
          </nav>
        </div>

        {/* 统计卡片 */}
        {activeTab === 'users' ? (
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
                      <dd className="text-lg font-medium text-gray-900">{userStats.totalUsers}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{userStats.activeUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <NoSymbolIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">暂停用户</dt>
                      <dd className="text-lg font-medium text-gray-900">{userStats.suspendedUsers}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">本月新用户</dt>
                      <dd className="text-lg font-medium text-gray-900">{userStats.newUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
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
                      <dd className="text-lg font-medium text-gray-900">{appStats.totalUsers}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{appStats.activeUsers}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{appStats.newUsers}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{appStats.totalApps}</dd>
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
                      <dd className="text-lg font-medium text-gray-900">{appStats.activeApps}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 搜索和过滤 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={activeTab === 'users' ? "搜索用户邮箱或昵称..." : "搜索应用名称或描述..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            {activeTab === 'users' && (
              <div className="sm:w-48">
                <div className="relative">
                  <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">所有角色</option>
                    <option value="owner">所有者</option>
                    <option value="admin">管理员</option>
                    <option value="member">成员</option>
                  </select>
                </div>
              </div>
            )}
            <div className="sm:w-48">
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有状态</option>
                  {activeTab === 'users' ? (
                    <>
                      <option value="active">活跃</option>
                      <option value="inactive">非活跃</option>
                      <option value="suspended">已暂停</option>
                    </>
                  ) : (
                    <>
                      <option value="active">运行中</option>
                      <option value="inactive">已停止</option>
                      <option value="pending">待激活</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        {activeTab === 'users' ? (
          /* 租户用户列表 */
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  租户用户列表 ({filteredTenantUsers.length} 个用户)
                </h3>
              </div>

              {filteredTenantUsers.length === 0 ? (
                <div className="text-center py-12">
                  <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暂无用户</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? '未找到匹配的用户' : '还没有任何用户'}
                  </p>
                  {!searchTerm && (
                    <div className="mt-6">
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <UserPlusIcon className="h-4 w-4 mr-2" />
                        邀请用户
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            用户
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            角色
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            状态
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            最后登录
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            加入时间
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTenantUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {user.avatar ? (
                                  <img
                                    className="h-10 w-10 rounded-full object-cover"
                                    src={user.avatar}
                                    alt={user.nickname}
                                  />
                                ) : (
                                  <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <UsersIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.nickname}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                {getRoleText(user.role)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                                {getStatusText(user.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : '从未登录'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex items-center justify-end space-x-2">
                                {user.role !== 'owner' && (
                                  <>
                                    <button
                                      onClick={() => handleEditUser(user)}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveUser(user)}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                                {user.status === 'inactive' && (
                                  <button
                                    onClick={() => handleResendInvitation(user)}
                                    className="text-green-600 hover:text-green-800"
                                  >
                                    <EnvelopeIcon className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 分页 */}
                  {filteredTenantUsers.length > 0 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          显示第 {((pagination.current - 1) * pagination.pageSize) + 1} - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 条，共 {pagination.total} 条
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handlePageChange(pagination.current - 1)}
                            disabled={pagination.current <= 1}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            <ChevronLeftIcon className="w-4 h-4" />
                          </button>
                          
                          <span className="px-3 py-1 text-sm">
                            第 {pagination.current} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
                          </span>
                          
                          <button
                            onClick={() => handlePageChange(pagination.current + 1)}
                            disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                            className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            <ChevronRightIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          /* 应用用户管理 */
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
        )}

        {/* 邀请用户模态框 */}
        {showInviteModal && (
          <InviteUserModal
            formData={inviteFormData}
            setFormData={setInviteFormData}
            submitting={submitting}
            onSubmit={handleInviteUser}
            onClose={() => setShowInviteModal(false)}
          />
        )}

        {/* 编辑用户模态框 */}
        {showEditModal && editingUser && (
          <EditUserModal
            user={editingUser}
            formData={editFormData}
            setFormData={setEditFormData}
            submitting={submitting}
            onSubmit={handleUpdateUser}
            onClose={() => setShowEditModal(false)}
          />
        )}
      </div>
    </TenantLayout>
  )
}

// 邀请用户模态框组件
const InviteUserModal: React.FC<{
  formData: InviteTenantUserRequest
  setFormData: (data: InviteTenantUserRequest) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}> = ({ formData, setFormData, submitting, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">邀请用户</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邮箱地址 *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色 *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'member' })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="member">成员</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                邀请消息（可选）
              </label>
              <textarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="欢迎加入我们的团队..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? '发送中...' : '发送邀请'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 编辑用户模态框组件
const EditUserModal: React.FC<{
  user: TenantUser
  formData: UpdateTenantUserRequest
  setFormData: (data: UpdateTenantUserRequest) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}> = ({ user, formData, setFormData, submitting, onSubmit, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">编辑用户: {user.nickname}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户邮箱
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                角色
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'member' })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="member">成员</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状态
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="active">活跃</option>
                <option value="inactive">非活跃</option>
                <option value="suspended">已暂停</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? '更新中...' : '更新'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
