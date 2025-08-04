import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
  ClockIcon,
  EnvelopeIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  KeyIcon,
  PlusIcon,
  XMarkIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '../../../components/TenantLayout'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { appUserApi, type AppUser, type AppUsersResponse } from '@api/tenant/appUser'
import { userPermissionsApi, type Permission, type Role, type UserPermission, type UserRole } from '@api/tenant/appPermissions'

export default function AppUserManagement() {
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [app, setApp] = useState<any>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'ban' | 'suspend' | 'restrict' | 'unban'>('ban')
  const [actionReason, setActionReason] = useState('')
  const [banUntil, setBanUntil] = useState('')
  const [processingAction, setProcessingAction] = useState(false)

  // 权限管理相关状态
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([])
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([])
  const [selectedRoles, setSelectedRoles] = useState<number[]>([])
  const [permissionExpiry, setPermissionExpiry] = useState('')
  const [loadingPermissions, setLoadingPermissions] = useState(false)

  const pageSize = 20

  useEffect(() => {
    if (appId) {
      fetchAppData()
      fetchUsers()
    }
  }, [appId, statusFilter, currentPage])

  const fetchAppData = async () => {
    if (!appId) return
    
    try {
      const response = await tenantAppApi.getTenantApp(appId)
      setApp(response.data)
    } catch (err: any) {
      console.error('获取应用信息失败:', err)
      setError(err.response?.data?.error || '获取应用信息失败')
    }
  }

  const fetchUsers = async () => {
    if (!appId) return
    
    try {
      setLoading(true)
      const response: AppUsersResponse = await appUserApi.getAppUsersByStatus(
        appId, 
        statusFilter || undefined, 
        currentPage, 
        pageSize
      )
      setUsers(response.users || [])
      setTotalUsers(response.pagination?.total || 0)
    } catch (err: any) {
      console.error('获取用户列表失败:', err)
      setError(err.response?.data?.error || '获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  // 获取应用权限和角色
  const fetchPermissionsAndRoles = async () => {
    if (!appId) return
    
    try {
      const [permissionsRes, rolesRes] = await Promise.all([
        userPermissionsApi.getAppPermissions(appId),
        userPermissionsApi.getAppRoles(appId)
      ])
      setPermissions(permissionsRes.permissions || [])
      setRoles(rolesRes.roles || [])
    } catch (err: any) {
      console.error('获取权限和角色失败:', err)
    }
  }

  // 获取用户权限和角色
  const fetchUserPermissions = async (userId: string) => {
    if (!appId) return
    
    try {
      setLoadingPermissions(true)
      const [permissionsRes, rolesRes] = await Promise.all([
        userPermissionsApi.getUserPermissions(appId, userId),
        userPermissionsApi.getUserRoles(appId, userId)
      ])
      setUserPermissions(permissionsRes.permissions || [])
      setUserRoles(rolesRes.roles || [])
    } catch (err: any) {
      console.error('获取用户权限失败:', err)
    } finally {
      setLoadingPermissions(false)
    }
  }

  // 打开权限管理模态框
  const handleManagePermissions = async (user: AppUser) => {
    setSelectedUser(user)
    setShowPermissionModal(true)
    await fetchPermissionsAndRoles()
    await fetchUserPermissions(user.user_id.toString())
  }

  // 授予用户权限
  const handleGrantPermissions = async () => {
    if (!selectedUser || !appId || selectedPermissions.length === 0) return

    try {
      await userPermissionsApi.grantUserPermissions(appId, selectedUser.user_id.toString(), {
        permission_ids: selectedPermissions,
        expires_at: permissionExpiry || undefined
      })
      
      // 重新获取用户权限
      await fetchUserPermissions(selectedUser.user_id.toString())
      setSelectedPermissions([])
      setPermissionExpiry('')
      alert('权限授予成功')
    } catch (err: any) {
      console.error('授予权限失败:', err)
      alert(err.response?.data?.error || '授予权限失败')
    }
  }

  // 分配用户角色
  const handleAssignRoles = async () => {
    if (!selectedUser || !appId || selectedRoles.length === 0) return

    try {
      await userPermissionsApi.assignUserRoles(appId, selectedUser.user_id.toString(), {
        role_ids: selectedRoles,
        expires_at: permissionExpiry || undefined
      })
      
      // 重新获取用户角色
      await fetchUserPermissions(selectedUser.user_id.toString())
      setSelectedRoles([])
      setPermissionExpiry('')
      alert('角色分配成功')
    } catch (err: any) {
      console.error('分配角色失败:', err)
      alert(err.response?.data?.error || '分配角色失败')
    }
  }

  // 撤销用户权限
  const handleRevokePermission = async (permissionId: number) => {
    if (!selectedUser || !appId) return

    if (!confirm('确定要撤销此权限吗？')) return

    try {
      await userPermissionsApi.revokeUserPermission(appId, selectedUser.user_id.toString(), permissionId)
      await fetchUserPermissions(selectedUser.user_id.toString())
      alert('权限撤销成功')
    } catch (err: any) {
      console.error('撤销权限失败:', err)
      alert(err.response?.data?.error || '撤销权限失败')
    }
  }

  // 撤销用户角色
  const handleRevokeRole = async (roleId: number) => {
    if (!selectedUser || !appId) return

    if (!confirm('确定要撤销此角色吗？')) return

    try {
      await userPermissionsApi.revokeUserRole(appId, selectedUser.user_id.toString(), roleId)
      await fetchUserPermissions(selectedUser.user_id.toString())
      alert('角色撤销成功')
    } catch (err: any) {
      console.error('撤销角色失败:', err)
      alert(err.response?.data?.error || '撤销角色失败')
    }
  }

  const handleUserAction = (user: AppUser, action: 'ban' | 'suspend' | 'restrict' | 'unban') => {
    setSelectedUser(user)
    setActionType(action)
    setActionReason('')
    setBanUntil('')
    setShowActionModal(true)
  }

  const executeUserAction = async () => {
    if (!selectedUser || !appId) return

    try {
      setProcessingAction(true)
      
      const data: any = {
        status: actionType === 'unban' ? 'active' : actionType === 'ban' ? 'banned' : actionType,
        reason: actionReason
      }

      if (actionType === 'suspend' && banUntil) {
        data.ban_until = banUntil
      }

      await appUserApi.updateUserStatus(appId, selectedUser.user_id.toString(), data)
      
      setShowActionModal(false)
      fetchUsers() // 重新加载用户列表
      
      // 显示成功消息
      alert(`用户${getActionText(actionType)}成功`)
    } catch (err: any) {
      console.error('操作失败:', err)
      alert(err.response?.data?.error || '操作失败，请重试')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRevokeAuthorization = async (user: AppUser) => {
    if (!appId) return
    
    if (!confirm(`确定要撤销用户 ${user.user_nickname || user.user_email} 的应用授权吗？`)) {
      return
    }

    try {
      await appUserApi.revokeUserAuthorization(appId, user.user_id.toString())
      fetchUsers() // 重新加载用户列表
      alert('授权撤销成功')
    } catch (err: any) {
      console.error('撤销授权失败:', err)
      alert(err.response?.data?.error || '撤销授权失败，请重试')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'banned':
        return 'bg-red-100 text-red-800'
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800'
      case 'restricted':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '正常'
      case 'banned':
        return '已封禁'
      case 'suspended':
        return '暂停使用'
      case 'restricted':
        return '受限制'
      default:
        return '未知'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'banned':
        return <NoSymbolIcon className="h-5 w-5 text-red-500" />
      case 'suspended':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'restricted':
        return <ShieldExclamationIcon className="h-5 w-5 text-orange-500" />
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'ban':
        return '封禁'
      case 'suspend':
        return '暂停'
      case 'restrict':
        return '限制'
      case 'unban':
        return '解封'
      default:
        return action
    }
  }

  const filteredUsers = users.filter(user => 
    searchTerm === '' || 
    user.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.user_nickname && user.user_nickname.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalPages = Math.ceil(totalUsers / pageSize)

  if (loading && users.length === 0) {
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
                  fetchUsers()
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <UsersIcon className="h-8 w-8 mr-3 text-blue-600" />
              用户管理
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              管理应用 "{app?.name}" 的用户访问权限
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate(`/tenant/apps/${appId}/permissions`)}
              className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <KeyIcon className="h-4 w-4 mr-2" />
              权限管理
            </button>
            <button
              onClick={() => navigate(`/tenant/apps/${appId}/roles`)}
              className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <ShieldCheckIcon className="h-4 w-4 mr-2" />
              角色管理
            </button>
            <button
              onClick={() => navigate(`/tenant/apps/${appId}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              返回应用详情
            </button>
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
                  placeholder="搜索用户邮箱或昵称..."
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
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有状态</option>
                  <option value="active">正常</option>
                  <option value="banned">已封禁</option>
                  <option value="suspended">暂停使用</option>
                  <option value="restricted">受限制</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                用户列表 ({totalUsers} 个用户)
              </h3>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">暂无用户</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? '未找到匹配的用户' : '该应用还没有用户授权'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最后活跃
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        授权时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        权限范围
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {user.user_avatar ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={user.user_avatar}
                                alt={user.user_nickname || user.user_email}
                              />
                            ) : (
                              <UserCircleIcon className="h-10 w-10 text-gray-300" />
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.user_nickname || '未设置昵称'}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <EnvelopeIcon className="h-4 w-4 mr-1" />
                                {user.user_email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(user.status)}
                            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.status)}`}>
                              {getStatusText(user.status)}
                            </span>
                          </div>
                          {user.ban_reason && (
                            <div className="text-xs text-gray-500 mt-1">
                              原因: {user.ban_reason}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.last_active_at ? (
                            new Date(user.last_active_at).toLocaleString()
                          ) : (
                            '从未活跃'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.first_authorized_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="max-w-xs truncate">
                            {user.scopes || '基础权限'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleManagePermissions(user)}
                              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                            >
                              <ShieldCheckIcon className="h-3 w-3 mr-1" />
                              权限
                            </button>
                            {user.status === 'active' ? (
                              <>
                                <button
                                  onClick={() => handleUserAction(user, 'restrict')}
                                  className="text-orange-600 hover:text-orange-900"
                                >
                                  限制
                                </button>
                                <button
                                  onClick={() => handleUserAction(user, 'suspend')}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  暂停
                                </button>
                                <button
                                  onClick={() => handleUserAction(user, 'ban')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  封禁
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUserAction(user, 'unban')}
                                className="text-green-600 hover:text-green-900"
                              >
                                解封
                              </button>
                            )}
                            <button
                              onClick={() => handleRevokeAuthorization(user)}
                              className="text-gray-600 hover:text-gray-900"
                            >
                              撤销授权
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示第 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalUsers)} 条，共 {totalUsers} 条
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    第 {currentPage} 页，共 {totalPages} 页
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 用户操作模态框 */}
      {showActionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {getActionText(actionType)}用户
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              用户: {selectedUser.user_nickname || selectedUser.user_email}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'unban' ? '解封原因' : '原因说明'}
                </label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder={actionType === 'unban' ? '请输入解封原因...' : '请输入操作原因...'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              {actionType === 'suspend' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    暂停截止时间（可选）
                  </label>
                  <input
                    type="datetime-local"
                    value={banUntil}
                    onChange={(e) => setBanUntil(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    留空表示无限期暂停
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowActionModal(false)}
                disabled={processingAction}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={executeUserAction}
                disabled={processingAction || !actionReason.trim()}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50 ${
                  actionType === 'unban' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {processingAction ? '处理中...' : `确认${getActionText(actionType)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 权限管理模态框 */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-6xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  用户权限管理 - {selectedUser.user_nickname || selectedUser.user_email}
                </h3>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {loadingPermissions ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左侧：当前权限和角色 */}
                  <div className="space-y-6">
                    {/* 当前权限 */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <KeyIcon className="h-5 w-5 mr-2 text-blue-600" />
                        当前权限 ({userPermissions.length})
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {userPermissions.length > 0 ? (
                          <div className="space-y-2">
                            {userPermissions.map((userPerm) => (
                              <div key={userPerm.id} className="flex items-center justify-between bg-white p-3 rounded-md border">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {userPerm.permission.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {userPerm.permission.description}
                                  </div>
                                  {userPerm.expires_at && (
                                    <div className="text-xs text-orange-600 mt-1">
                                      过期时间: {new Date(userPerm.expires_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRevokePermission(userPerm.permission_id)}
                                  className="ml-2 text-red-600 hover:text-red-800"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            暂无权限
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 当前角色 */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                        当前角色 ({userRoles.length})
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {userRoles.length > 0 ? (
                          <div className="space-y-2">
                            {userRoles.map((userRole) => (
                              <div key={userRole.id} className="flex items-center justify-between bg-white p-3 rounded-md border">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {userRole.role.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {userRole.role.description}
                                  </div>
                                  <div className="text-xs text-blue-600 mt-1">
                                    包含 {userRole.role.permissions?.length || 0} 个权限
                                  </div>
                                  {userRole.expires_at && (
                                    <div className="text-xs text-orange-600 mt-1">
                                      过期时间: {new Date(userRole.expires_at).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleRevokeRole(userRole.role_id)}
                                  className="ml-2 text-red-600 hover:text-red-800"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-4">
                            暂无角色
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：分配权限和角色 */}
                  <div className="space-y-6">
                    {/* 分配权限 */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <PlusIcon className="h-5 w-5 mr-2 text-blue-600" />
                        分配权限
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="max-h-40 overflow-y-auto">
                            <div className="space-y-2">
                              {permissions.map((permission) => {
                                const hasPermission = userPermissions.some(up => up.permission_id === permission.id)
                                return (
                                  <label key={permission.id} className={`flex items-center p-2 rounded ${hasPermission ? 'bg-gray-200 text-gray-500' : 'bg-white cursor-pointer hover:bg-blue-50'}`}>
                                    <input
                                      type="checkbox"
                                      checked={selectedPermissions.includes(permission.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedPermissions([...selectedPermissions, permission.id])
                                        } else {
                                          setSelectedPermissions(selectedPermissions.filter(id => id !== permission.id))
                                        }
                                      }}
                                      disabled={hasPermission}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                                    />
                                    <div className="ml-3 flex-1">
                                      <div className="text-sm font-medium">
                                        {permission.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {permission.description}
                                      </div>
                                    </div>
                                    {hasPermission && (
                                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                        已拥有
                                      </span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              过期时间（可选）
                            </label>
                            <input
                              type="datetime-local"
                              value={permissionExpiry}
                              onChange={(e) => setPermissionExpiry(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <button
                            onClick={handleGrantPermissions}
                            disabled={selectedPermissions.length === 0}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            授予选中权限 ({selectedPermissions.length})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 分配角色 */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <PlusIcon className="h-5 w-5 mr-2 text-green-600" />
                        分配角色
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="max-h-40 overflow-y-auto">
                            <div className="space-y-2">
                              {roles.map((role) => {
                                const hasRole = userRoles.some(ur => ur.role_id === role.id)
                                return (
                                  <label key={role.id} className={`flex items-center p-2 rounded ${hasRole ? 'bg-gray-200 text-gray-500' : 'bg-white cursor-pointer hover:bg-green-50'}`}>
                                    <input
                                      type="checkbox"
                                      checked={selectedRoles.includes(role.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRoles([...selectedRoles, role.id])
                                        } else {
                                          setSelectedRoles(selectedRoles.filter(id => id !== role.id))
                                        }
                                      }}
                                      disabled={hasRole}
                                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded disabled:opacity-50"
                                    />
                                    <div className="ml-3 flex-1">
                                      <div className="text-sm font-medium">
                                        {role.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {role.description}
                                      </div>
                                      <div className="text-xs text-blue-500 mt-1">
                                        包含 {role.permissions?.length || 0} 个权限
                                      </div>
                                    </div>
                                    {hasRole && (
                                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                        已拥有
                                      </span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                          <button
                            onClick={handleAssignRoles}
                            disabled={selectedRoles.length === 0}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            分配选中角色 ({selectedRoles.length})
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
