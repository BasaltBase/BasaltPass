import React, { useEffect, useMemo, useState } from 'react'
import { uiAlert, uiConfirm } from '@contexts/DialogContext'
import { useParams, useNavigate } from 'react-router-dom'
import {
  UsersIcon,
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
  XMarkIcon
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { appUserApi, type AppUser, type AppUsersResponse } from '@api/tenant/appUser'
import { userPermissionsApi, type Permission, type Role, type UserPermission, type UserRole } from '@api/tenant/appPermissions'
import useDebounce from '@hooks/useDebounce'
import useManagedPaginationBar from '@hooks/useManagedPaginationBar'
import { PSkeleton, PBadge, PPageHeader, PButton, PManagementFilterCard, PManagedTableSection, PSelect, PManagementPageContainer, PTextarea } from '@ui'
import { type PTableColumn } from '@ui/PTable'
import { useI18n } from '@shared/i18n'

export default function AppUserManagement() {
  const { t, locale } = useI18n()
  const { id: appId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [app, setApp] = useState<any>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<'ban' | 'suspend' | 'restrict' | 'unban'>('ban')
  const [actionReason, setActionReason] = useState('')
  const [banUntil, setBanUntil] = useState('')
  const [processingAction, setProcessingAction] = useState(false)

  // 
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
      console.error(t('tenantAppUserManagement.logs.fetchAppFailed'), err)
      setError(err.response?.data?.error || t('tenantAppUserManagement.errors.fetchAppFailed'))
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
      console.error(t('tenantAppUserManagement.logs.fetchUsersFailed'), err)
      setError(err.response?.data?.error || t('tenantAppUserManagement.errors.fetchUsersFailed'))
    } finally {
      setLoading(false)
    }
  }

  // 
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
      console.error(t('tenantAppUserManagement.logs.fetchPermissionsAndRolesFailed'), err)
    }
  }

  // 
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
      console.error(t('tenantAppUserManagement.logs.fetchUserPermissionsFailed'), err)
    } finally {
      setLoadingPermissions(false)
    }
  }

  // 
  const handleManagePermissions = async (user: AppUser) => {
    setSelectedUser(user)
    setShowPermissionModal(true)
    await fetchPermissionsAndRoles()
    await fetchUserPermissions(user.user_id.toString())
  }

  // 
  const handleGrantPermissions = async () => {
    if (!selectedUser || !appId || selectedPermissions.length === 0) return

    try {
      await userPermissionsApi.grantUserPermissions(appId, selectedUser.user_id.toString(), {
        permission_ids: selectedPermissions,
        expires_at: permissionExpiry || undefined
      })
      
      // 
      await fetchUserPermissions(selectedUser.user_id.toString())
      setSelectedPermissions([])
      setPermissionExpiry('')
      uiAlert(t('tenantAppUserManagement.success.permissionGranted'))
    } catch (err: any) {
      console.error(t('tenantAppUserManagement.logs.grantPermissionFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppUserManagement.errors.grantPermissionFailed'))
    }
  }

  // 
  const handleAssignRoles = async () => {
    if (!selectedUser || !appId || selectedRoles.length === 0) return

    try {
      await userPermissionsApi.assignUserRoles(appId, selectedUser.user_id.toString(), {
        role_ids: selectedRoles,
        expires_at: permissionExpiry || undefined
      })
      
      // 
      await fetchUserPermissions(selectedUser.user_id.toString())
      setSelectedRoles([])
      setPermissionExpiry('')
      uiAlert(t('tenantAppUserManagement.success.roleAssigned'))
    } catch (err: any) {
      console.error(t('tenantAppUserManagement.logs.assignRoleFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppUserManagement.errors.assignRoleFailed'))
    }
  }

  // 
  const handleRevokePermission = async (permissionId: number) => {
    if (!selectedUser || !appId) return

    if (!await uiConfirm(t('tenantAppUserManagement.confirm.revokePermission'))) return

    try {
      await userPermissionsApi.revokeUserPermission(appId, selectedUser.user_id.toString(), permissionId)
      await fetchUserPermissions(selectedUser.user_id.toString())
      uiAlert(t('tenantAppUserManagement.success.permissionRevoked'))
    } catch (err: any) {
      console.error(t('tenantAppUserManagement.logs.revokePermissionFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppUserManagement.errors.revokePermissionFailed'))
    }
  }

  // 
  const handleRevokeRole = async (roleId: number) => {
    if (!selectedUser || !appId) return

    if (!await uiConfirm(t('tenantAppUserManagement.confirm.revokeRole'))) return

    try {
      await userPermissionsApi.revokeUserRole(appId, selectedUser.user_id.toString(), roleId)
      await fetchUserPermissions(selectedUser.user_id.toString())
      uiAlert(t('tenantAppUserManagement.success.roleRevoked'))
    } catch (err: any) {
      console.error(t('tenantAppUserManagement.logs.revokeRoleFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppUserManagement.errors.revokeRoleFailed'))
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
      fetchUsers() // 
      
      // 
      uiAlert(t('tenantAppUserManagement.success.userActionSuccess', { action: getActionText(actionType) }))
    } catch (err: any) {
      console.error(t('tenantAppUserManagement.logs.userActionFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppUserManagement.errors.userActionFailed'))
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRevokeAuthorization = async (user: AppUser) => {
    if (!appId) return
    
    if (!await uiConfirm(t('tenantAppUserManagement.confirm.revokeAuthorization', { user: user.user_nickname || user.user_email }))) {
      return
    }

    try {
      await appUserApi.revokeUserAuthorization(appId, user.user_id.toString())
      fetchUsers() // 
      uiAlert(t('tenantAppUserManagement.success.authorizationRevoked'))
    } catch (err: any) {
      console.error(t('tenantAppUserManagement.logs.revokeAuthorizationFailed'), err)
      uiAlert(err.response?.data?.error || t('tenantAppUserManagement.errors.revokeAuthorizationFailed'))
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'banned': return 'error'
      case 'suspended': return 'warning'
      case 'restricted': return 'orange'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('tenantAppUserManagement.status.active')
      case 'banned':
        return t('tenantAppUserManagement.status.banned')
      case 'suspended':
        return t('tenantAppUserManagement.status.suspended')
      case 'restricted':
        return t('tenantAppUserManagement.status.restricted')
      default:
        return t('tenantAppUserManagement.status.unknown')
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
        return t('tenantAppUserManagement.actions.ban')
      case 'suspend':
        return t('tenantAppUserManagement.actions.suspend')
      case 'restrict':
        return t('tenantAppUserManagement.actions.restrict')
      case 'unban':
        return t('tenantAppUserManagement.actions.unban')
      default:
        return action
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      debouncedSearchTerm === '' ||
      user.user_email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      (user.user_nickname && user.user_nickname.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
    )
  }, [users, debouncedSearchTerm])

  const userColumns: PTableColumn<AppUser>[] = [
    {
      key: 'user',
      title: t('tenantAppUserManagement.table.user'),
      render: (user) => (
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
              {user.user_nickname || t('tenantAppUserManagement.fields.nicknameNotSet')}
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <EnvelopeIcon className="h-4 w-4 mr-1" />
              {user.user_email}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: t('tenantAppUserManagement.table.status'),
      render: (user) => (
        <div>
          <div className="flex items-center">
            {getStatusIcon(user.status)}
            <PBadge variant={getStatusVariant(user.status) as any} className="ml-2">
              {getStatusText(user.status)}
            </PBadge>
          </div>
          {user.ban_reason ? (
            <div className="text-xs text-gray-500 mt-1">
              {t('tenantAppUserManagement.fields.reason')}: {user.ban_reason}
            </div>
          ) : null}
        </div>
      )
    },
    {
      key: 'last_active_at',
      title: t('tenantAppUserManagement.table.lastActive'),
      render: (user) => (
        <span className="text-sm text-gray-500">
          {user.last_active_at
            ? new Date(user.last_active_at).toLocaleString(locale)
            : t('tenantAppUserManagement.fields.neverActive')}
        </span>
      )
    },
    {
      key: 'first_authorized_at',
      title: t('tenantAppUserManagement.table.authorizedAt'),
      sortable: true,
      sorter: (a, b) => new Date(a.first_authorized_at).getTime() - new Date(b.first_authorized_at).getTime(),
      render: (user) => (
        <span className="text-sm text-gray-500">{new Date(user.first_authorized_at).toLocaleString(locale)}</span>
      )
    },
    {
      key: 'scopes',
      title: t('tenantAppUserManagement.table.scopes'),
      render: (user) => (
        <div className="max-w-xs truncate text-sm text-gray-500">
          {user.scopes || t('tenantAppUserManagement.fields.defaultScopes')}
        </div>
      )
    },
    {
      key: 'actions',
      title: t('tenantAppUserManagement.table.actions'),
      align: 'right',
      render: (user) => (
        <div className="flex flex-wrap justify-end gap-2">
          <PButton
            size="sm"
            variant="secondary"
            onClick={() => handleManagePermissions(user)}
            leftIcon={<ShieldCheckIcon className="h-3 w-3" />}
          >
            {t('tenantAppUserManagement.actions.permissions')}
          </PButton>
          {user.status === 'active' ? (
            <>
              <PButton size="sm" variant="secondary" onClick={() => handleUserAction(user, 'restrict')}>
                {t('tenantAppUserManagement.actions.restrict')}
              </PButton>
              <PButton size="sm" variant="secondary" onClick={() => handleUserAction(user, 'suspend')}>
                {t('tenantAppUserManagement.actions.suspend')}
              </PButton>
              <PButton size="sm" variant="danger" onClick={() => handleUserAction(user, 'ban')}>
                {t('tenantAppUserManagement.actions.ban')}
              </PButton>
            </>
          ) : (
            <PButton size="sm" variant="secondary" onClick={() => handleUserAction(user, 'unban')}>
              {t('tenantAppUserManagement.actions.unban')}
            </PButton>
          )}
          <PButton size="sm" variant="danger" onClick={() => handleRevokeAuthorization(user)}>
            {t('tenantAppUserManagement.actions.revokeAuthorization')}
          </PButton>
        </div>
      )
    }
  ]

  const paginationBar = useManagedPaginationBar({
    currentPage,
    pageSize,
    totalItems: totalUsers,
    onPageChange: setCurrentPage,
    summary: ({ start, end, total }) => t('tenantRoleManagement.pagination.summary', { start, end, total }),
    pageInfo: ({ currentPage: page, totalPages }) => t('tenantRoleManagement.pagination.pageInfo', { current: page, total: totalPages }),
  })

  if (loading && users.length === 0) {
    return (
      <TenantLayout title={t('tenantAppUserManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantAppUserManagement.layoutTitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton onClick={() => { setError(''); fetchUsers() }}>{t('tenantAppUserManagement.actions.retry')}</PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantAppUserManagement.layoutTitle')}>
      <PManagementPageContainer
        header={
          <PPageHeader
            title={t('tenantAppUserManagement.title')}
            description={t('tenantAppUserManagement.description', { name: app?.name || '-' })}
            icon={<UsersIcon className="h-8 w-8 text-blue-600" />}
            actions={
              <div className="flex flex-wrap gap-2">
                <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/permissions`)} leftIcon={<KeyIcon className="h-4 w-4" />}>{t('tenantAppUserManagement.actions.permissionManagement')}</PButton>
                <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}/roles`)} leftIcon={<ShieldCheckIcon className="h-4 w-4" />}>{t('tenantAppUserManagement.actions.roleManagement')}</PButton>
                <PButton variant="secondary" onClick={() => navigate(`/tenant/apps/${appId}`)}>{t('tenantAppUserManagement.actions.backToAppDetail')}</PButton>
              </div>
            }
          />
        }
        filter={
          <PManagementFilterCard
            searchValue={searchTerm}
            onSearchChange={(value: string) => {
              setSearchTerm(value)
              setCurrentPage(1)
            }}
            searchPlaceholder={t('tenantAppUserManagement.searchPlaceholder')}
            rightContent={
              <div className="relative">
                <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <PSelect
                  value={statusFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-10"
                >
                  <option value="">{t('tenantAppUserManagement.filters.allStatus')}</option>
                  <option value="active">{t('tenantAppUserManagement.status.active')}</option>
                  <option value="banned">{t('tenantAppUserManagement.status.banned')}</option>
                  <option value="suspended">{t('tenantAppUserManagement.status.suspended')}</option>
                  <option value="restricted">{t('tenantAppUserManagement.status.restricted')}</option>
                </PSelect>
              </div>
            }
          />
        }
      >
        <PManagedTableSection<AppUser>
          data={filteredUsers}
          columns={userColumns}
          rowKey={(row: AppUser) => row.id}
          emptyText={searchTerm ? t('tenantAppUserManagement.empty.searchNoResult') : t('tenantAppUserManagement.empty.noAuthorizedUser')}
          size="md"
          striped
          defaultSort={{ key: 'first_authorized_at', order: 'desc' }}
          pagination={paginationBar}
        />
      </PManagementPageContainer>

      {/*  */}
      {showActionModal && selectedUser && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {t('tenantAppUserManagement.modal.userActionTitle', { action: getActionText(actionType) })}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {t('tenantAppUserManagement.table.user')}: {selectedUser.user_nickname || selectedUser.user_email}
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'unban' ? t('tenantAppUserManagement.modal.unbanReason') : t('tenantAppUserManagement.modal.reasonLabel')}
                </label>
                <PTextarea
                  value={actionReason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActionReason(e.target.value)}
                  placeholder={actionType === 'unban' ? t('tenantAppUserManagement.modal.unbanReasonPlaceholder') : t('tenantAppUserManagement.modal.reasonPlaceholder')}
                  rows={3}
                />
              </div>

              {actionType === 'suspend' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('tenantAppUserManagement.modal.suspendUntilOptional')}
                  </label>
                  <input
                    type="datetime-local"
                    value={banUntil}
                    onChange={(e) => setBanUntil(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('tenantAppUserManagement.modal.suspendUntilHint')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <PButton
                variant="secondary"
                onClick={() => setShowActionModal(false)}
                disabled={processingAction}
              >
                {t('tenantAppUserManagement.actions.cancel')}
              </PButton>
              <PButton
                variant={actionType === 'unban' ? 'secondary' : 'danger'}
                onClick={executeUserAction}
                disabled={processingAction || !actionReason.trim()}
                loading={processingAction}
              >
                {t('tenantAppUserManagement.actions.confirmAction', { action: getActionText(actionType) })}
              </PButton>
            </div>
          </div>
        </div>
      )}

      {/*  */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto w-full max-w-6xl rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {t('tenantAppUserManagement.permissionModal.title', { user: selectedUser.user_nickname || selectedUser.user_email })}
                </h3>
                <PButton
                  variant="ghost"
                  onClick={() => setShowPermissionModal(false)}
                >
                  <XMarkIcon className="h-6 w-6" />
                </PButton>
              </div>

              {loadingPermissions ? (
                <div className="py-4">
                  <PSkeleton.List items={3} showAvatar={false} />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ： */}
                  <div className="space-y-6">
                    {/*  */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <KeyIcon className="h-5 w-5 mr-2 text-blue-600" />
                        {t('tenantAppUserManagement.permissionModal.currentPermissions', { count: userPermissions.length })}
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {userPermissions.length > 0 ? (
                          <div className="space-y-2">
                            {userPermissions.map((userPerm) => (
                                <div key={userPerm.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-white p-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                    {userPerm.permission?.name || t('tenantAppUserManagement.permissionModal.permissionWithId', { id: userPerm.permission_id })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {userPerm.permission?.description || t('tenantAppUserManagement.permissionModal.permissionDetailUnavailable')}
                                  </div>
                                  {userPerm.expires_at && (
                                    <div className="text-xs text-orange-600 mt-1">
                                      {t('tenantAppUserManagement.permissionModal.expiresAt')}: {new Date(userPerm.expires_at).toLocaleString(locale)}
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
                            {t('tenantAppUserManagement.permissionModal.noPermissions')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/*  */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <ShieldCheckIcon className="h-5 w-5 mr-2 text-green-600" />
                        {t('tenantAppUserManagement.permissionModal.currentRoles', { count: userRoles.length })}
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        {userRoles.length > 0 ? (
                          <div className="space-y-2">
                            {userRoles.map((userRole) => (
                                <div key={userRole.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border bg-white p-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate">
                                    {userRole.role?.name || t('tenantAppUserManagement.permissionModal.roleWithId', { id: userRole.role_id })}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {userRole.role?.description || t('tenantAppUserManagement.permissionModal.roleDetailUnavailable')}
                                  </div>
                                  <div className="text-xs text-blue-600 mt-1">
                                    {t('tenantAppUserManagement.permissionModal.includesPermissions', { count: userRole.role?.permissions?.length || 0 })}
                                  </div>
                                  {userRole.expires_at && (
                                    <div className="text-xs text-orange-600 mt-1">
                                      {t('tenantAppUserManagement.permissionModal.expiresAt')}: {new Date(userRole.expires_at).toLocaleString(locale)}
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
                            {t('tenantAppUserManagement.permissionModal.noRoles')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ： */}
                  <div className="space-y-6">
                    {/*  */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <PlusIcon className="h-5 w-5 mr-2 text-blue-600" />
                        {t('tenantAppUserManagement.permissionModal.assignPermissions')}
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
                                        {t('tenantAppUserManagement.permissionModal.alreadyHas')}
                                      </span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('tenantAppUserManagement.permissionModal.expiresAtOptional')}
                            </label>
                            <input
                              type="datetime-local"
                              value={permissionExpiry}
                              onChange={(e) => setPermissionExpiry(e.target.value)}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <PButton
                            className="w-full"
                            onClick={handleGrantPermissions}
                            disabled={selectedPermissions.length === 0}
                          >
                            {t('tenantAppUserManagement.permissionModal.grantSelectedPermissions', { count: selectedPermissions.length })}
                          </PButton>
                        </div>
                      </div>
                    </div>

                    {/*  */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                        <PlusIcon className="h-5 w-5 mr-2 text-green-600" />
                        {t('tenantAppUserManagement.permissionModal.assignRoles')}
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
                                        {t('tenantAppUserManagement.permissionModal.includesPermissions', { count: role.permissions?.length || 0 })}
                                      </div>
                                    </div>
                                    {hasRole && (
                                      <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                        {t('tenantAppUserManagement.permissionModal.alreadyHas')}
                                      </span>
                                    )}
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                          <PButton
                            variant="secondary"
                            className="w-full"
                            onClick={handleAssignRoles}
                            disabled={selectedRoles.length === 0}
                          >
                            {t('tenantAppUserManagement.permissionModal.assignSelectedRoles', { count: selectedRoles.length })}
                          </PButton>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <PButton
                  variant="secondary"
                  onClick={() => setShowPermissionModal(false)}
                >
                  {t('tenantAppUserManagement.actions.close')}
                </PButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
