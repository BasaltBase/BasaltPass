import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link } from 'react-router-dom'
import {
  UsersIcon,
  CubeIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  ClockIcon,
  ShieldExclamationIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserPlusIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { PInput, PSelect, PButton, PTextarea, PSkeleton, PBadge, PPageHeader, PManagementFilterCard, PManagedTableSection } from '@ui'
import { PManagementPageContainer, PManagementStatsGrid, PManagementToast } from '@ui'
import { type PTableColumn } from '@ui/PTable'
import { tenantAppApi } from '@api/tenant/tenantApp'
import { appUserApi, type AppUserStats } from '@api/tenant/appUser'
import useDebounce from '@hooks/useDebounce'
import useManagedPaginationBar from '@hooks/useManagedPaginationBar'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'
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
  const { t, locale } = useI18n()
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
  const debouncedSearchTerm = useDebounce(searchTerm, 200)
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activeTab, setActiveTab] = useState<'apps' | 'users'>('users')
  
  // 
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  
  // 
  const [inviteFormData, setInviteFormData] = useState<InviteTenantUserRequest>({
    email: '',
    role: 'user',
    message: ''
  })
  
  const [editFormData, setEditFormData] = useState<UpdateTenantUserRequest>({
    role: 'user',
    status: 'active'
  })

  // 
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  // 
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
  }, [activeTab, debouncedSearchTerm, statusFilter, roleFilter])

  const fetchTenantUsers = async (page = 1, pageSize = 20) => {
    try {
      setLoading(true)
      const response = await tenantUserManagementApi.getTenantUsers({
        page,
        limit: pageSize,
        search: debouncedSearchTerm,
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
      console.error(t('tenantUserManagement.logs.fetchTenantUsersFailed'), err)
      setError(err.response?.data?.error || t('tenantUserManagement.errors.fetchTenantUsersFailed'))
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
      console.error(t('tenantUserManagement.logs.fetchTenantUserStatsFailed'), err)
    }
  }

  const fetchAppsWithUserStats = async () => {
    try {
      setLoading(true)
      
      const appsResponse = await tenantAppApi.listTenantApps()
      const appsList = appsResponse.data?.apps || []

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
            console.error(t('tenantUserManagement.logs.fetchAppStatsFailed', { appId: app.id }), err)
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
      console.error(t('tenantUserManagement.logs.fetchAppsFailed'), err)
      setError(err.response?.data?.error || t('tenantUserManagement.errors.fetchAppsFailed'))
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'inactive': return 'warning'
      case 'suspended': return 'error'
      case 'pending': return 'info'
      default: return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('tenantUserManagement.status.active')
      case 'inactive':
        return t('tenantUserManagement.status.inactive')
      case 'suspended':
        return t('tenantUserManagement.status.suspended')
      case 'pending':
        return t('tenantUserManagement.status.pending')
      default:
        return t('tenantUserManagement.status.unknown')
    }
  }

  const getRoleVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'purple'
      case 'admin': return 'info'
      case 'user':
      case 'member': return 'success'
      default: return 'default'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'owner':
        return t('tenantUserManagement.role.owner')
      case 'admin':
        return t('tenantUserManagement.role.admin')
      case 'user':
      case 'member':
        return t('tenantUserManagement.role.member')
      default:
        return t('tenantUserManagement.role.unknown')
    }
  }

  const filteredApps = apps.filter(app => {
    const matchesSearch = debouncedSearchTerm === '' || 
      app.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      app.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || app.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const filteredTenantUsers = tenantUsers.filter(user => {
    const matchesSearch = debouncedSearchTerm === '' || 
      user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.nickname.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === '' || user.status === statusFilter
    const matchesRole = roleFilter === '' || user.role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
  })

  const handleInviteUser = async () => {
    try {
      setSubmitting(true)
      await tenantUserManagementApi.inviteTenantUser(inviteFormData)
      showMessage('success', t('tenantUserManagement.messages.inviteSent'))
      setShowInviteModal(false)
      setInviteFormData({ email: '', role: 'user', message: '' })
      fetchTenantUsers()
      fetchTenantUserStats()
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || t('tenantUserManagement.messages.inviteFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditUser = (user: TenantUser) => {
    setEditingUser(user)
    setEditFormData({
      role: user.role === 'owner' ? 'admin' : user.role === 'admin' ? 'admin' : 'user',
      status: user.status
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    
    try {
      setSubmitting(true)
      await tenantUserManagementApi.updateTenantUser(editingUser.id, editFormData)
      showMessage('success', t('tenantUserManagement.messages.userUpdated'))
      setShowEditModal(false)
      setEditingUser(null)
      fetchTenantUsers()
      fetchTenantUserStats()
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || t('tenantUserManagement.messages.userUpdateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveUser = async (user: TenantUser) => {
    if (user.role === 'owner') {
      showMessage('error', t('tenantUserManagement.messages.cannotRemoveOwner'))
      return
    }

    if (!await uiConfirm(t('tenantUserManagement.confirm.removeUser', { user: user.nickname || user.email }))) {
      return
    }

    try {
      await tenantUserManagementApi.removeTenantUser(user.id)
      showMessage('success', t('tenantUserManagement.messages.userRemoved'))
      fetchTenantUsers()
      fetchTenantUserStats()
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || t('tenantUserManagement.messages.userRemoveFailed'))
    }
  }

  const handleResendInvitation = async (user: TenantUser) => {
    try {
      await tenantUserManagementApi.resendInvitation(user.id)
      showMessage('success', t('tenantUserManagement.messages.inviteResent'))
    } catch (err: any) {
      showMessage('error', err.response?.data?.error || t('tenantUserManagement.messages.inviteResendFailed'))
    }
  }

  // 
  const handlePageChange = (page: number) => {
    fetchTenantUsers(page, pagination.pageSize)
  }

  const userListPaginationBar = useManagedPaginationBar({
    currentPage: pagination.current,
    pageSize: pagination.pageSize,
    totalItems: pagination.total,
    onPageChange: handlePageChange,
    summary: ({ start, end, total }) => t('tenantUserManagement.pagination.showing', { start, end, total }),
    pageInfo: ({ currentPage, totalPages }) => t('tenantUserManagement.pagination.pageInfo', { current: currentPage, total: totalPages }),
  })

  // 
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

  const userStatItems = [
    { key: 'total_users', title: t('tenantUserManagement.stats.totalUsers'), value: userStats.totalUsers, icon: <UsersIcon className="h-6 w-6 text-blue-400" /> },
    { key: 'active_users', title: t('tenantUserManagement.stats.activeUsers'), value: userStats.activeUsers, icon: <CheckCircleIcon className="h-6 w-6 text-green-400" /> },
    { key: 'suspended_users', title: t('tenantUserManagement.stats.suspendedUsers'), value: userStats.suspendedUsers, icon: <NoSymbolIcon className="h-6 w-6 text-red-400" /> },
    { key: 'new_users_this_month', title: t('tenantUserManagement.stats.newUsersThisMonth'), value: userStats.newUsers, icon: <ClockIcon className="h-6 w-6 text-yellow-400" /> },
  ]

  const appStatItems = [
    { key: 'total_users', title: t('tenantUserManagement.stats.totalUsers'), value: appStats.totalUsers, icon: <UsersIcon className="h-6 w-6 text-blue-400" /> },
    { key: 'active_users', title: t('tenantUserManagement.stats.activeUsers'), value: appStats.activeUsers, icon: <CheckCircleIcon className="h-6 w-6 text-green-400" /> },
    { key: 'new_users', title: t('tenantUserManagement.stats.newUsers'), value: appStats.newUsers, icon: <ClockIcon className="h-6 w-6 text-yellow-400" /> },
    { key: 'total_apps', title: t('tenantUserManagement.stats.totalApps'), value: appStats.totalApps, icon: <CubeIcon className="h-6 w-6 text-purple-400" /> },
    { key: 'active_apps', title: t('tenantUserManagement.stats.activeApps'), value: appStats.activeApps, icon: <CheckCircleIcon className="h-6 w-6 text-green-400" /> },
  ]

  const tenantUserColumns: PTableColumn<TenantUser>[] = [
    {
      key: 'user',
      title: t('tenantUserManagement.table.user'),
      render: (user) => (
        <div className="flex items-center">
          {user.avatar ? (
            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.nickname} />
          ) : (
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
              <UsersIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{user.nickname}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      key: 'app_count',
      title: t('tenantUserManagement.table.appCount'),
      render: (u) => <span className="text-sm text-gray-700">{u.app_count ?? 0}</span>
    },
    {
      key: 'role',
      title: t('tenantUserManagement.table.role'),
      render: (user) => (
        <div className="flex items-center gap-2">
          <PBadge variant={getRoleVariant(user.role) as any}>{getRoleText(user.role)}</PBadge>
          {!user.is_tenant_user ? (
            <PBadge variant="default">{t('tenantUserManagement.table.appUser')}</PBadge>
          ) : null}
        </div>
      )
    },
    {
      key: 'status',
      title: t('tenantUserManagement.table.status'),
      render: (user) => (
        <PBadge variant={getStatusVariant(user.status) as any}>{getStatusText(user.status)}</PBadge>
      )
    },
    {
      key: 'last_login',
      title: t('tenantUserManagement.table.lastLogin'),
      render: (user) => (
        <span className="text-sm text-gray-500">
          {user.last_login_at
            ? new Date(user.last_login_at).toLocaleDateString(locale)
            : user.last_active_at
            ? new Date(user.last_active_at).toLocaleDateString(locale)
            : t('tenantUserManagement.table.notAvailable')}
        </span>
      )
    },
    {
      key: 'created_at',
      title: t('tenantUserManagement.table.joinedAt'),
      dataIndex: 'created_at',
      sortable: true,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    },
    {
      key: 'actions',
      title: t('tenantUserManagement.table.actions'),
      align: 'right',
      render: (user) => (
        <div className="flex items-center justify-end space-x-2">
          {user.is_tenant_user && user.role !== 'owner' ? (
            <>
              <PButton
                variant="ghost"
                size="sm"
                onClick={() => handleEditUser(user)}
                className="text-blue-600 hover:text-blue-800"
                title={t('tenantUserManagement.actions.editUser')}
              >
                <PencilIcon className="h-4 w-4" />
              </PButton>
              <PButton
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveUser(user)}
                className="text-red-600 hover:text-red-800"
                title={t('tenantUserManagement.actions.removeUser')}
              >
                <TrashIcon className="h-4 w-4" />
              </PButton>
            </>
          ) : null}
          {user.is_tenant_user && user.status === 'inactive' ? (
            <PButton
              variant="ghost"
              size="sm"
              onClick={() => handleResendInvitation(user)}
              className="text-green-600 hover:text-green-800"
              title={t('tenantUserManagement.actions.resendInvitation')}
            >
              <EnvelopeIcon className="h-4 w-4" />
            </PButton>
          ) : null}
        </div>
      )
    }
  ]

  const appColumns: PTableColumn<AppWithUserStats>[] = [
    {
      key: 'app',
      title: t('tenantUserManagement.appTable.app'),
      render: (app) => (
        <div className="flex items-center">
          {app.logo_url ? (
            <img className="h-10 w-10 rounded-lg object-cover" src={app.logo_url} alt={app.name} />
          ) : (
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CubeIcon className="h-6 w-6 text-blue-600" />
            </div>
          )}
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">{app.name}</div>
            <div className="text-sm text-gray-500 max-w-xs truncate">{app.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      title: t('tenantUserManagement.appTable.status'),
      render: (app) => (
        <PBadge variant={getStatusVariant(app.status) as any}>{getStatusText(app.status)}</PBadge>
      )
    },
    {
      key: 'total_users',
      title: t('tenantUserManagement.appTable.totalUsers'),
      render: (app) => (
        <div className="flex items-center text-sm text-gray-900">
          <UsersIcon className="h-4 w-4 text-gray-400 mr-1" />
          {app.userStats.total_users}
        </div>
      )
    },
    {
      key: 'active_users',
      title: t('tenantUserManagement.appTable.activeUsers'),
      render: (app) => (
        <div className="flex items-center text-sm text-gray-900">
          <CheckCircleIcon className="h-4 w-4 text-green-400 mr-1" />
          {app.userStats.active_users}
        </div>
      )
    },
    {
      key: 'new_users',
      title: t('tenantUserManagement.appTable.newUsers'),
      render: (app) => (
        <div className="flex items-center text-sm text-gray-900">
          <ClockIcon className="h-4 w-4 text-yellow-400 mr-1" />
          {app.userStats.new_users}
        </div>
      )
    },
    {
      key: 'actions',
      title: t('tenantUserManagement.appTable.actions'),
      align: 'right',
      render: (app) => (
        <Link
          to={`/tenant/apps/${app.id}/users`}
          className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          {t('tenantUserManagement.appTable.manageUsers')}
        </Link>
      )
    }
  ]

  if (loading) {
    return (
      <TenantLayout title={t('tenantUserManagement.page.title')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  if (error) {
    return (
      <TenantLayout title={t('tenantUserManagement.page.title')}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error}</h3>
            <div className="mt-6">
              <PButton
                onClick={() => {
                  setError('')
                  fetchAppsWithUserStats()
                }}
                size="sm"
              >
                {t('tenantUserManagement.common.retry')}
              </PButton>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantUserManagement.page.title')}>
      <PManagementPageContainer
        notice={
          <PManagementToast
            visible={message.visible}
            type={message.type}
            text={message.text}
            onClose={() => setMessage((prev) => ({ ...prev, visible: false }))}
          />
        }
        header={
          <PPageHeader
            title={t('tenantUserManagement.page.title')}
            description={t('tenantUserManagement.page.subtitle')}
            icon={<UsersIcon className="h-8 w-8 text-blue-600" />}
            actions={activeTab === 'users' ? (
              <PButton onClick={() => setShowInviteModal(true)} leftIcon={<UserPlusIcon className="w-5 h-5" />}>{t('tenantUserManagement.actions.inviteUser')}</PButton>
            ) : undefined}
          />
        }
        toolbar={
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
                {t('tenantUserManagement.tabs.tenantUsers')}
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
                {t('tenantUserManagement.tabs.appUsers')}
              </button>
            </nav>
          </div>
        }
        stats={
          <PManagementStatsGrid
            items={activeTab === 'users' ? userStatItems : appStatItems}
            gridClassName={activeTab === 'users' ? 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4' : 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5'}
          />
        }
        filter={
          <PManagementFilterCard
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={activeTab === 'users' ? t('tenantUserManagement.filters.searchUsers') : t('tenantUserManagement.filters.searchApps')}
            rightContentClassName={activeTab === 'users' ? 'lg:w-[28rem]' : 'lg:w-64'}
            rightContent={
              <div className={`grid gap-3 ${activeTab === 'users' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                {activeTab === 'users' ? (
                  <div className="relative">
                    <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
                    <PSelect
                      value={roleFilter}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRoleFilter(e.target.value)}
                      className="pl-10"
                    >
                      <option value="">{t('tenantUserManagement.filters.allRoles')}</option>
                      <option value="owner">{t('tenantUserManagement.role.owner')}</option>
                      <option value="admin">{t('tenantUserManagement.role.admin')}</option>
                      <option value="user">{t('tenantUserManagement.role.member')}</option>
                    </PSelect>
                  </div>
                ) : null}
                <div className="relative">
                  <FunnelIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400 z-10" />
                  <PSelect
                    value={statusFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
                    className="pl-10"
                  >
                    <option value="">{t('tenantUserManagement.filters.allStatuses')}</option>
                    {activeTab === 'users' ? (
                      <>
                        <option value="active">{t('tenantUserManagement.status.active')}</option>
                        <option value="inactive">{t('tenantUserManagement.status.inactive')}</option>
                        <option value="suspended">{t('tenantUserManagement.status.suspended')}</option>
                      </>
                    ) : (
                      <>
                        <option value="active">{t('tenantUserManagement.appStatus.active')}</option>
                        <option value="inactive">{t('tenantUserManagement.appStatus.inactive')}</option>
                        <option value="pending">{t('tenantUserManagement.appStatus.pending')}</option>
                      </>
                    )}
                  </PSelect>
                </div>
              </div>
            }
          />
        }
      >

        {activeTab === 'users' ? (
          <PManagedTableSection<TenantUser>
            data={filteredTenantUsers}
            columns={tenantUserColumns}
            rowKey={(row) => row.id}
            defaultSort={{ key: 'created_at', order: 'desc' }}
            emptyText={searchTerm ? t('tenantUserManagement.empty.noUserMatch') : t('tenantUserManagement.empty.noUsersYet')}
            emptyContent={!searchTerm ? (
              <PButton onClick={() => setShowInviteModal(true)} leftIcon={<UserPlusIcon className="h-4 w-4" />}>
                {t('tenantUserManagement.actions.inviteUser')}
              </PButton>
            ) : undefined}
            pagination={userListPaginationBar}
          />
        ) : (
          <PManagedTableSection<AppWithUserStats>
            data={filteredApps}
            columns={appColumns}
            rowKey={(row) => row.id}
            emptyText={searchTerm ? t('tenantUserManagement.appUsers.noAppMatch') : t('tenantUserManagement.appUsers.noAppsYet')}
            emptyContent={!searchTerm ? (
              <Link to={ROUTES.tenant.appsNew}>
                <PButton>{t('tenantUserManagement.appUsers.createApp')}</PButton>
              </Link>
            ) : undefined}
          />
        )}

      </PManagementPageContainer>

        {/*  */}
        {showInviteModal && (
          <InviteUserModal
            formData={inviteFormData}
            setFormData={setInviteFormData}
            submitting={submitting}
            onSubmit={handleInviteUser}
            onClose={() => setShowInviteModal(false)}
          />
        )}

        {/*  */}
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

// 
const InviteUserModal: React.FC<{
  formData: InviteTenantUserRequest
  setFormData: (data: InviteTenantUserRequest) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}> = ({ formData, setFormData, submitting, onSubmit, onClose }) => {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">{t('tenantUserManagement.modalInvite.title')}</h3>
            <PButton
              variant="ghost"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </PButton>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tenantUserManagement.modalInvite.emailLabel')}
              </label>
              <PInput
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <PSelect
                value={formData.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                label={t('tenantUserManagement.modalInvite.roleLabel')}
              >
                <option value="user">{t('tenantUserManagement.role.member')}</option>
                <option value="admin">{t('tenantUserManagement.role.admin')}</option>
              </PSelect>
            </div>

            <div>
              <PTextarea
                value={formData.message || ''}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={3}
                placeholder={t('tenantUserManagement.modalInvite.messagePlaceholder')}
                label={t('tenantUserManagement.modalInvite.messageLabel')}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton
                type="button"
                onClick={onClose}
                disabled={submitting}
                variant="secondary"
              >
                {t('tenantUserManagement.common.cancel')}
              </PButton>
              <PButton type="submit" loading={submitting}>
                {t('tenantUserManagement.modalInvite.submit')}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// 
const EditUserModal: React.FC<{
  user: TenantUser
  formData: UpdateTenantUserRequest
  setFormData: (data: UpdateTenantUserRequest) => void
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
}> = ({ user, formData, setFormData, submitting, onSubmit, onClose }) => {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">{t('tenantUserManagement.modalEdit.title', { user: user.nickname })}</h3>
            <PButton
              variant="ghost"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </PButton>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('tenantUserManagement.modalEdit.emailLabel')}
              </label>
              <PInput type="email" value={user.email} disabled />
            </div>

            <div>
              <PSelect
                value={formData.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                label={t('tenantUserManagement.modalEdit.roleLabel')}
              >
                <option value="user">{t('tenantUserManagement.role.member')}</option>
                <option value="admin">{t('tenantUserManagement.role.admin')}</option>
              </PSelect>
            </div>

            <div>
              <PSelect
                value={formData.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'suspended' })}
                label={t('tenantUserManagement.modalEdit.statusLabel')}
              >
                <option value="active">{t('tenantUserManagement.status.active')}</option>
                <option value="inactive">{t('tenantUserManagement.status.inactive')}</option>
                <option value="suspended">{t('tenantUserManagement.status.suspended')}</option>
              </PSelect>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton
                type="button"
                onClick={onClose}
                disabled={submitting}
                variant="secondary"
              >
                {t('tenantUserManagement.common.cancel')}
              </PButton>
              <PButton type="submit" loading={submitting}>
                {t('tenantUserManagement.modalEdit.submit')}
              </PButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
