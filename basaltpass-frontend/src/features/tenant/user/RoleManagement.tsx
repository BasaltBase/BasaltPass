import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
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
import { PSelect } from '@ui';
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
} from '@api/tenant/tenantRole';
import TenantLayout from '@features/tenant/components/TenantLayout';
import { PCheckbox, PInput, PButton, PTextarea } from '@ui';
import PTable, { PTableColumn } from '@ui/PTable';
import useDebounce from '@hooks/useDebounce';

const TenantRoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userRoleModalVisible, setUserRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  // 删除确认改为统一使用确认框，无需内联二次确认状态
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
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const debouncedUserSearchTerm = useDebounce(userSearchTerm, 200);
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
        search: debouncedSearchTerm,
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
        search: debouncedUserSearchTerm
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
  }, [debouncedSearchTerm, appFilter]);

  useEffect(() => {
    if (userRoleModalVisible) {
      fetchUsers();
    }
  }, [userRoleModalVisible, debouncedUserSearchTerm]);

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
            <PButton variant="ghost" size="sm" onClick={() => setMessage(prev => ({ ...prev, visible: false }))} className="ml-2">
              <XMarkIcon className="w-4 h-4" />
            </PButton>
          </div>
        )}

        {/* 页面标题与操作 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">角色权限管理</h1>
          </div>
          <div className="flex space-x-3">
            <PButton onClick={() => setUserRoleModalVisible(true)} leftIcon={<UsersIcon className="w-5 h-5" />}>用户角色分配</PButton>
            <PButton onClick={() => setModalVisible(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>创建角色</PButton>
          </div>
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <PInput
                  type="text"
                  placeholder="搜索角色名称、代码或描述..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  icon={<MagnifyingGlassIcon className="w-5 h-5" />}
                />
              </div>
            </div>
            <div className="sm:w-48">
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                <PSelect
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="pl-10"
                >
                  <option value="">全部范围</option>
                  <option value="tenant">租户级角色</option>
                </PSelect>
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
            <PTable
              columns={[
                {
                  key: 'info',
                  title: '角色信息',
                  render: (role: Role) => (
                    <div>
                      <div className="text-sm font-medium text-gray-900">{role.name}</div>
                      <div className="text-sm text-gray-500">{role.code}</div>
                      {role.description && (
                        <div className="text-xs text-gray-400 mt-1">{role.description}</div>
                      )}
                    </div>
                  )
                },
                {
                  key: 'type',
                  title: '类型',
                  render: (role: Role) => (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleTypeStyle(role.is_system)}`}>
                      {getRoleTypeText(role.is_system)}
                    </span>
                  )
                },
                {
                  key: 'scope',
                  title: '应用范围',
                  render: (role: Role) => (
                    role.app_name ? (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {role.app_name}
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                        租户级
                      </span>
                    )
                  )
                },
                { key: 'user_count', title: '用户数量', dataIndex: 'user_count' },
                { key: 'created_at', title: '创建时间', dataIndex: 'created_at', sortable: true, sorter: (a: Role, b: Role) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
                {
                  key: 'actions',
                  title: '操作',
                  align: 'right',
                  render: (role: Role) => (
                    <div className="flex items-center justify-end space-x-2">
                      {!role.is_system && (
                        <>
                          <PButton variant="ghost" size="sm" onClick={() => handleEdit(role)} title="编辑角色" className="text-blue-600 hover:text-blue-800">
                            <PencilIcon className="w-4 h-4" />
                          </PButton>
                          <PButton
                            variant="ghost"
                            size="sm"
                            onClick={async () => { if (await uiConfirm('确认删除该角色？')) handleDelete(role.id); }}
                            title="删除角色"
                            className="text-red-600 hover:text-red-800"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </PButton>
                        </>
                      )}
                    </div>
                  )
                },
              ]}
              data={roles}
              rowKey={(r) => String(r.id)}
              defaultSort={{ key: 'created_at', order: 'desc' }}
            />
          )}

          {/* 分页 */}
          {roles.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  显示第 {((pagination.current - 1) * pagination.pageSize) + 1} - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 条，共 {pagination.total} 条
                </div>
                <div className="flex items-center space-x-2">
                  <PButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current - 1)}
                    disabled={pagination.current <= 1}
                    className="rounded-lg"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </PButton>
                  
                  <span className="px-3 py-1 text-sm">
                    第 {pagination.current} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
                  </span>
                  
                  <PButton
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(pagination.current + 1)}
                    disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                    className="rounded-lg"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </PButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 创建/编辑角色模态框 */}
        {modalVisible && (
          <div className="fixed inset-0 !m-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 !m-0 transition-opacity" aria-hidden="true">
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
                        <PInput
                          type="text"
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder="如：admin、user、viewer等"
                          required
                        />
                      </div>

                      {/* 角色名称 */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          角色名称 <span className="text-red-500">*</span>
                        </label>
                        <PInput
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="请输入角色名称"
                          required
                        />
                      </div>

                      {/* 角色描述 */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          角色描述
                        </label>
                        <PTextarea
                          id="description"
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="请输入角色描述"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <PButton type="submit">
                      {editingRole ? '更新角色' : '创建角色'}
                    </PButton>
                    <PButton
                      type="button"
                      variant="secondary"
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
                      className="sm:ml-3 sm:mt-0 mt-3"
                    >
                      取消
                    </PButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* 用户角色分配模态框 */}
        {userRoleModalVisible && (
          <div className="fixed inset-0 !m-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 !m-0 transition-opacity" aria-hidden="true">
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
                          <PInput
                            type="text"
                            placeholder="搜索用户..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="pl-9"
                            size="sm"
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
                              <PButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUserPageChange(userPagination.current - 1)}
                                disabled={userPagination.current <= 1}
                                className="rounded"
                              >
                                <ChevronLeftIcon className="w-4 h-4" />
                              </PButton>
                              <span>{userPagination.current}/{Math.ceil(userPagination.total / userPagination.pageSize)}</span>
                              <PButton
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUserPageChange(userPagination.current + 1)}
                                disabled={userPagination.current >= Math.ceil(userPagination.total / userPagination.pageSize)}
                                className="rounded"
                              >
                                <ChevronRightIcon className="w-4 h-4" />
                              </PButton>
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
                              <div key={role.id} className="flex items-start space-x-3">
                                <PCheckbox
                                  checked={selectedRoleIds.includes(role.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRoleIds([...selectedRoleIds, role.id]);
                                    } else {
                                      setSelectedRoleIds(selectedRoleIds.filter(id => id !== role.id));
                                    }
                                  }}
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
                              </div>
                            ))}
                            <div className="pt-4 border-t">
                              <PButton onClick={handleAssignRoles} className="w-full">
                                分配角色
                              </PButton>
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
