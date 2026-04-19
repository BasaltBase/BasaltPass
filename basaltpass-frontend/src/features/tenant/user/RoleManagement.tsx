import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { 
  ShieldCheckIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UsersIcon,
  FunnelIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { PSelect, EntitySearchSelect, PSkeleton, PBadge, PPageHeader, PButton, PInput, PCheckbox, PTextarea, PManagementFilterCard, PManagedTableSection, PManagementPageContainer, PManagementToast } from '@ui';
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
import { PTableColumn } from '@ui/PTable';
import useDebounce from '@hooks/useDebounce';
import useManagedPaginationBar from '@hooks/useManagedPaginationBar';
import { useI18n } from '@shared/i18n';

const TenantRoleManagement: React.FC = () => {
  const { t } = useI18n();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [userRoleModalVisible, setUserRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  // ，
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [appFilter, setAppFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  // 
  const [formData, setFormData] = useState<CreateRoleRequest>({
    code: '',
    name: '',
    description: '',
    app_id: undefined,
  });

  // 
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

  // 
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
      showMessage('error', error.response?.data?.error || t('tenantRoleManagement.messages.fetchRolesFailed'));
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchRoles();
  }, [debouncedSearchTerm, appFilter]);



  // /
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        await updateTenantRole(editingRole.id, formData);
        showMessage('success', t('tenantRoleManagement.messages.roleUpdated'));
      } else {
        await createTenantRole(formData);
        showMessage('success', t('tenantRoleManagement.messages.roleCreated'));
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
      showMessage('error', error.response?.data?.error || t('tenantRoleManagement.messages.operationFailed'));
    }
  };

  // 
  const handleDelete = async (id: number) => {
    try {
      await deleteTenantRole(id);
      showMessage('success', t('tenantRoleManagement.messages.deleted'));
      fetchRoles();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || t('tenantRoleManagement.messages.deleteFailed'));
    }
  };

  // 
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

  // 
  const handleUserRoleAssignment = (user: TenantUser) => {
    setSelectedUser(user);
    fetchUserRoles(user.id);
  };

  // 
  const fetchUserRoles = async (userId: number) => {
    try {
      const response = await getUserRoles(userId);
      setUserRoles(response.data.data);
      setSelectedRoleIds(response.data.data.roles.map((role: Role) => role.id));
    } catch (error: any) {
      setUserRoles(null);
      setSelectedRoleIds([]);
      showMessage('error', error.response?.data?.error || t('tenantRoleManagement.messages.fetchUserRolesFailed'));
    }
  };

  // 
  const handleAssignRoles = async () => {
    if (!selectedUser) return;
    
    try {
      await assignUserRoles({
        user_id: selectedUser.id,
        role_ids: selectedRoleIds,
      });
      showMessage('success', t('tenantRoleManagement.messages.rolesAssigned'));
      setUserRoleModalVisible(false);
      setSelectedUser(null);
      setUserRoles(null);
      setSelectedRoleIds([]);
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || t('tenantRoleManagement.messages.assignFailed'));
    }
  };

  // 
  const handlePageChange = (page: number) => {
    fetchRoles(page, pagination.pageSize);
  };

  const paginationBar = useManagedPaginationBar({
    currentPage: pagination.current,
    pageSize: pagination.pageSize,
    totalItems: pagination.total,
    onPageChange: handlePageChange,
    className: 'mt-0 rounded-none border-t border-gray-200 shadow-none',
    summary: ({ start, end, total }) => t('tenantRoleManagement.pagination.summary', { start, end, total }),
    pageInfo: ({ currentPage, totalPages }) => t('tenantRoleManagement.pagination.pageInfo', { current: currentPage, total: totalPages }),
  });



  const getRoleTypeVariant = (isSystem: boolean) => {
    return isSystem ? 'purple' : 'info';
  };

  const getRoleTypeText = (isSystem: boolean) => {
    return isSystem ? t('tenantRoleManagement.roleType.system') : t('tenantRoleManagement.roleType.custom');
  };

  return (
    <TenantLayout title={t('tenantRoleManagement.layoutTitle')}>
      <PManagementPageContainer
        className="space-y-6 p-6"
        notice={
          <PManagementToast
            visible={message.visible}
            type={message.type}
            text={message.text}
            onClose={() => setMessage(prev => ({ ...prev, visible: false }) )}
          />
        }
        header={
          <PPageHeader
            title={t('tenantRoleManagement.header.title')}
            icon={<ShieldCheckIcon className="w-8 h-8 text-blue-600" />}
            actions={
              <div className="flex space-x-3">
                <PButton onClick={() => setUserRoleModalVisible(true)} leftIcon={<UsersIcon className="w-5 h-5" />}>{t('tenantRoleManagement.actions.userRoleAssignment')}</PButton>
                <PButton onClick={() => setModalVisible(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('tenantRoleManagement.actions.createRole')}</PButton>
              </div>
            }
          />
        }
        filter={
          <PManagementFilterCard
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('tenantRoleManagement.search.placeholder')}
            rightContent={
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-1/2 z-10 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <PSelect
                  value={appFilter}
                  onChange={(e) => setAppFilter(e.target.value)}
                  className="pl-10"
                >
                  <option value="">{t('tenantRoleManagement.filters.allScope')}</option>
                  <option value="tenant">{t('tenantRoleManagement.filters.tenantScope')}</option>
                </PSelect>
              </div>
            }
          />
        }
      >

        {/*  */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('tenantRoleManagement.list.title')}</h2>
          </div>
          
          {loading ? (
            <PSkeleton.List items={3} />
          ) : roles.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{t('tenantRoleManagement.list.empty')}</p>
            </div>
          ) : (
            <PManagedTableSection
              columns={[
                {
                  key: 'info',
                  title: t('tenantRoleManagement.table.roleInfo'),
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
                  title: t('tenantRoleManagement.table.type'),
                  render: (role: Role) => (
                    <PBadge variant={getRoleTypeVariant(role.is_system) as any}>{getRoleTypeText(role.is_system)}</PBadge>
                  )
                },
                {
                  key: 'scope',
                  title: t('tenantRoleManagement.table.scope'),
                  render: (role: Role) => (
                    role.app_name ? (
                      <PBadge variant="info">{role.app_name}</PBadge>
                    ) : (
                      <PBadge variant="default">{t('tenantRoleManagement.filters.tenantScope')}</PBadge>
                    )
                  )
                },
                { key: 'user_count', title: t('tenantRoleManagement.table.userCount'), dataIndex: 'user_count' },
                { key: 'created_at', title: t('tenantRoleManagement.table.createdAt'), dataIndex: 'created_at', sortable: true, sorter: (a: Role, b: Role) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
                {
                  key: 'actions',
                  title: t('tenantRoleManagement.table.actions'),
                  align: 'right',
                  render: (role: Role) => (
                    <div className="flex items-center justify-end space-x-2">
                      {!role.is_system && (
                        <>
                          <PButton variant="ghost" size="sm" onClick={() => handleEdit(role)} title={t('tenantRoleManagement.actions.editRole')} className="text-blue-600 hover:text-blue-800">
                            <PencilIcon className="w-4 h-4" />
                          </PButton>
                          <PButton
                            variant="ghost"
                            size="sm"
                            onClick={async () => { if (await uiConfirm(t('tenantRoleManagement.confirm.deleteRole'))) handleDelete(role.id); }}
                            title={t('tenantRoleManagement.actions.deleteRole')}
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
              pagination={paginationBar}
            />
          )}
        </div>

      </PManagementPageContainer>

        {/* / */}
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
                        {editingRole ? t('tenantRoleManagement.modal.editTitle') : t('tenantRoleManagement.modal.createTitle')}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {/*  */}
                      <div>
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('tenantRoleManagement.form.codeLabel')} <span className="text-red-500">*</span>
                        </label>
                        <PInput
                          type="text"
                          id="code"
                          value={formData.code}
                          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                          placeholder={t('tenantRoleManagement.form.codePlaceholder')}
                          required
                        />
                      </div>

                      {/*  */}
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('tenantRoleManagement.form.nameLabel')} <span className="text-red-500">*</span>
                        </label>
                        <PInput
                          type="text"
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder={t('tenantRoleManagement.form.namePlaceholder')}
                          required
                        />
                      </div>

                      {/*  */}
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                          {t('tenantRoleManagement.form.descriptionLabel')}
                        </label>
                        <PTextarea
                          id="description"
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder={t('tenantRoleManagement.form.descriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <PButton type="submit">
                      {editingRole ? t('tenantRoleManagement.actions.updateRole') : t('tenantRoleManagement.actions.createRole')}
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
                      {t('tenantRoleManagement.actions.cancel')}
                    </PButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/*  */}
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
                      <h3 className="text-lg font-medium text-gray-900">{t('tenantRoleManagement.userRole.title')}</h3>
                    </div>
                    <button
                      onClick={() => setUserRoleModalVisible(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/*  */}
                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <h4 className="font-medium text-gray-900 mb-3">{t('tenantRoleManagement.userRole.selectUser')}</h4>
                        <div className="mb-3">
                          <EntitySearchSelect
                            entity="user"
                            context="tenant"
                            value={selectedUser ? [{
                              id: selectedUser.id,
                              label: selectedUser.nickname || selectedUser.email,
                              subtitle: selectedUser.email,
                              type: 'user',
                              raw: selectedUser
                            }] : []}
                            onChange={(items: any[]) => {
                              if (items.length > 0) {
                                handleUserRoleAssignment(items[items.length - 1].raw as TenantUser);
                              } else {
                                setSelectedUser(null);
                                setUserRoles(null);
                                setSelectedRoleIds([]);
                              }
                            }}
                            placeholder={t('tenantRoleManagement.userRole.searchUserPlaceholder')}
                            maxSelect={1}
                            variant="list"
                          />
                        </div>
                      </div>
                    </div>

                    {/*  */}
                    <div className="border rounded-lg">
                      <div className="p-4 border-b bg-gray-50">
                        <h4 className="font-medium text-gray-900">{t('tenantRoleManagement.userRole.assignRole')}</h4>
                        {selectedUser && (
                          <div className="mt-2 text-sm text-gray-600">
                            {t('tenantRoleManagement.userRole.currentUser', { user: selectedUser.nickname || selectedUser.email })}
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
                                  onChange={(e: any) => {
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
                                    <PBadge variant={getRoleTypeVariant(role.is_system) as any}>{getRoleTypeText(role.is_system)}</PBadge>
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
                                {t('tenantRoleManagement.actions.assignRoles')}
                              </PButton>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <UsersIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>{t('tenantRoleManagement.userRole.selectUserFirst')}</p>
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
    </TenantLayout>
  );
};

export default TenantRoleManagement;
