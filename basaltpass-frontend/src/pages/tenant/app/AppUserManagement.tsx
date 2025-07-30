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
  UserCircleIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '../../../components/TenantLayout'
import { tenantAppApi } from '../../../api/tenantApp'
import { appUserApi, type AppUser, type AppUsersResponse } from '../../../api/appUser'

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
          <button
            onClick={() => navigate(`/tenant/apps/${appId}`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            返回应用详情
          </button>
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
    </TenantLayout>
  )
}
