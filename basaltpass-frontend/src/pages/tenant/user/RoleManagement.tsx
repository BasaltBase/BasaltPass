import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  Role,
  CreateRoleRequest,
  getTenantRoles,
  createTenantRole,
  updateTenantRole,
  deleteTenantRole,
  getTenantUsersForRole,
  assignUserRoles,
  getUserRoles,
  TenantUser,
  UserRole
} from '../../api/tenantRole';
import TenantLayout from '@/components/TenantLayout';

const TenantRoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userRoleModalVisible, setUserRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [userPagination, setUserPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [appFilter, setAppFilter] = useState('');

  // 表单数据
  const [formData, setFormData] = useState<CreateRoleRequest>({
    code: '',
    name: '',
    description: '',
    app_id: undefined,
  });

  // 消息提示
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    visible: boolean;
  }>({
    type: 'info',
    text: '',
    visible: false,
  });

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text, visible: true });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // 获取角色列表
  const fetchRoles = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await getTenantRoles({ 
        page, 
        page_size: pageSize,
        search: searchTerm,
        app_id: appFilter
      });
      setRoles(response.data.data.roles || []);
      setPagination({
        current: page,
        pageSize,
        total: response.data.data.pagination.total || 0,
      });
    } catch (error: any) {
      setRoles([]);
      showMessage('error', error.response?.data?.error || '获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户列表
  const fetchUsers = async (page = 1, pageSize = 20) => {
    try {
      const response = await getTenantUsersForRole({ 
        page, 
        page_size: pageSize,
        search: userSearchTerm
      });
      setUsers(response.data.data.users || []);
      setUserPagination({
        current: page,
        pageSize,
        total: response.data.data.pagination.total || 0,
      });
    } catch (error: any) {
      setUsers([]);
      showMessage('error', error.response?.data?.error || '获取用户列表失败');
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [searchTerm, appFilter]);

  useEffect(() => {
    if (userRoleModalVisible) {
      fetchUsers();
    }
  }, [userRoleModalVisible, userSearchTerm]);

  // 创建/更新角色
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateTenantRole(editingRole.id, formData);
        showMessage('success', '角色更新成功');
      } else {
        await createTenantRole(formData);
        showMessage('success', '角色创建成功');
      }
      setModalVisible(false);
      setEditingRole(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        app_id: undefined,
      });
      fetchRoles();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || '操作失败');
    }
  };

  // 删除角色
  const handleDelete = async (id: number) => {
    try {
      await deleteTenantRole(id);
      showMessage('success', '删除成功');
      setDeleteConfirm(null);
      fetchRoles();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || '删除失败');
    }
  };

  // 打开编辑模态框
  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      code: role.code,
      name: role.name,
      description: role.description,
      app_id: role.app_id,
    });
    setModalVisible(true);
  };

  // 打开用户角色分配模态框
  const handleUserRoleAssignment = (user: TenantUser) => {
    setSelectedUser(user);
    fetchUserRoles(user.id);
  };

  // 获取用户角色
  const fetchUserRoles = async (userId: number) => {
    try {
      const response = await getUserRoles(userId);
      setUserRoles(response.data.data);
      setSelectedRoleIds(response.data.data.roles.map((role: Role) => role.id));
    } catch (error: any) {
      setUserRoles(null);
      setSelectedRoleIds([]);
      showMessage('error', error.response?.data?.error || '获取用户角色失败');
    }
  };

  // 分配用户角色
  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    
    try {
      await assignUserRoles({
        user_id: selectedUser.id,
        role_ids: selectedRoleIds,
      });
      showMessage('success', '角色分配成功');
      setUserRoleModalVisible(false);
      setSelectedUser(null);
      setUserRoles(null);
      setSelectedRoleIds([]);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || '角色分配失败');
    }
  };

  // 分页变化
  const handlePageChange = (page: number) => {
    fetchRoles(page, pagination.pageSize);
  };

  const handleUserPageChange = (page: number) => {
    fetchUsers(page, userPagination.pageSize);
  };

  // 角色类型样式映射
  const getRoleTypeStyle = (isSystem: boolean) => {
    return isSystem 
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getRoleTypeText = (isSystem: boolean) => {
    return isSystem ? '系统角色' : '自定义角色';
  };

  return (
    <TenantLayout title="角色权限管理">
      <div className="p-6">
        {/* 消息提示 */}
        {message.visible && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-500 text-white' :
            message.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
            {message.type === 'success' && <CheckIcon className="w-5 h-5" />}
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

        {/* 页面标题 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">角色权限管理</h1>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setUserRoleModalVisible(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <UsersIcon className="w-5 h-5" />
              <span>用户角色分配</span>
            </button>
            <button
              onClick={() => setModalVisible(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>创建角色</span>
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="搜索角色名称、代码或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="">全部范围</option>
                  <option value="tenant">租户级角色</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 角色列表 */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">角色列表</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">加载中...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>暂无角色记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色信息</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应用范围</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户数量</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{role.name}</div>
                          <div className="text-sm text-gray-500">{role.code}</div>
                          {role.description && (
                            <div className="text-xs text-gray-400 mt-1">{role.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleTypeStyle(role.is_system)}`}>
                          {getRoleTypeText(role.is_system)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {role.app_name ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            {role.app_name}
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                            租户级
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {role.user_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(role.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {deleteConfirm === role.id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDelete(role.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              确认删除
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            {!role.is_system && (
                              <>
                                <button
                                  onClick={() => handleEdit(role)}
                                  className="text-blue-600 hover:text-blue-800 p-1 transition-colors"
                                  title="编辑角色"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(role.id)}
                                  className="text-red-600 hover:text-red-800 p-1 transition-colors"
                                  title="删除角色"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 分页 */}
          {roles.length > 0 && (
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
        </div>

        {/* 创建/编辑角色模态框 */}
        {modalVisible && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setModalVisible(false)}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="flex items-center mb-4">
                      <ShieldCheckIcon className="w-6 h-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">
                        {editingRole ? '编辑角色' : '创建角色'}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/* 角色代码 */}
                      <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                          角色代码 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="如：admin、user、viewer等"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* 角色名称 */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          角色名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="请输入角色名称"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                      </div>

                      {/* 角色描述 */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          角色描述
                        </label>
                        <textarea
                          id="description"
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="请输入角色描述"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      {editingRole ? '更新角色' : '创建角色'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setModalVisible(false);
                        setEditingRole(null);
                        setFormData({
                          code: '',
                          name: '',
                          description: '',
                          app_id: undefined,
                        });
                      }}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 用户角色分配模态框 */}
        {userRoleModalVisible && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setUserRoleModalVisible(false)}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <UsersIcon className="w-6 h-6 text-green-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">用户角色分配</h3>
                    </div>
                    <button
                      onClick={() => setUserRoleModalVisible(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 用户列表 */}
                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-3">选择用户</h4>
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            placeholder="搜索用户..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {users.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => handleUserRoleAssignment(user)}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              selectedUser?.id === user.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{user.nickname || user.email}</div>
                                <div className="text-xs text-gray-500">{user.email}</div>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {user.role === 'owner' ? '所有者' : user.role === 'admin' ? '管理员' : '成员'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* 用户分页 */}
                      {users.length > 0 && (
                        <div className="p-3 border-t bg-gray-50">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>共 {userPagination.total} 个用户</span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => handleUserPageChange(userPagination.current - 1)}
                                disabled={userPagination.current <= 1}
                                className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                              >
                                <ChevronLeftIcon className="w-3 h-3" />
                              </button>
                              <span>{userPagination.current}/{Math.ceil(userPagination.total / userPagination.pageSize)}</span>
                              <button
                                onClick={() => handleUserPageChange(userPagination.current + 1)}
                                disabled={userPagination.current >= Math.ceil(userPagination.total / userPagination.pageSize)}
                                className="p-1 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200"
                              >
                                <ChevronRightIcon className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 角色分配 */}
                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <h4 className="font-medium text-gray-900">分配角色</h4>
                        {selectedUser && (
                          <div className="mt-2 text-sm text-gray-600">
                            当前用户：{selectedUser.nickname || selectedUser.email}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        {selectedUser ? (
                          <div className="space-y-3">
                            {roles.map((role) => (
                              <label key={role.id} className="flex items-start space-x-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedRoleIds.includes(role.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRoleIds([...selectedRoleIds, role.id]);
                                    } else {
                                      setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                                    }
                                  }}
                                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-900">{role.name}</span>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleTypeStyle(role.is_system)}`}>
                                      {getRoleTypeText(role.is_system)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">{role.code}</div>
                                  {role.description && (
                                    <div className="text-xs text-gray-400 mt-1">{role.description}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                            <div className="pt-4 border-t">
                              <button
                                onClick={handleAssignRoles}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                              >
                                分配角色
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>请先选择一个用户</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </TenantLayout>
  );
};

export default TenantRoleManagement;
