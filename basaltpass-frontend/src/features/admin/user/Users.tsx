import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
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
import AdminLayout from '@features/admin/components/AdminLayout'
import { PInput, PButton, PCheckbox } from '@ui'
import PTable, { PTableColumn } from '@ui/PTable'
import PSelect from '@ui/PSelect'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

export default function Users() {
  const { t, locale } = useI18n()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0
  })
  
  const [params, setParams] = useState<UserListParams>({
    page: 1,
    limit: 20,
    search: '',
    status: 'all',
    sort_by: 'created_at',
    sort_order: 'desc'
  })

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

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await adminUserApi.getUsers(params)
      setUsers(response.users)
      setPagination(response.pagination)
    } catch (error) {
      console.error(t('adminUsers.logs.loadUsersFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const stats = await adminUserApi.getUserStats()
      setStats(stats)
    } catch (error) {
      console.error(t('adminUsers.logs.loadStatsFailed'), error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [params])

  useEffect(() => {
    loadStats()
  }, [])

  const handleSearch = (search: string) => {
    setParams(prev => ({ ...prev, search, page: 1 }))
  }

  const handleStatusFilter = (status: UserListParams['status']) => {
    setParams(prev => ({ ...prev, status, page: 1 }))
  }

  const handlePageChange = (page: number) => {
    setParams(prev => ({ ...prev, page }))
  }

  const handleBanUser = async (user: AdminUser) => {
    try {
      await adminUserApi.banUser(user.id, {
        banned: !user.banned,
        reason: user.banned ? t('adminUsers.actions.unbanUser') : t('adminUsers.actions.adminActionReason')
      })
      loadUsers()
    } catch (error) {
      console.error(t('adminUsers.logs.operationFailed'), error)
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!await uiConfirm(t('adminUsers.confirm.deleteUser', { user: user.nickname || user.email }))) {
      return
    }
    
    try {
      await adminUserApi.deleteUser(user.id)
      loadUsers()
    } catch (error) {
      console.error(t('adminUsers.logs.deleteUserFailed'), error)
    }
  }

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password) {
      setCreateError(t('adminUsers.errors.emailPasswordRequired'))
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
      setCreateError(error.response?.data?.error || t('adminUsers.errors.createFailed'))
    } finally {
      setCreating(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale)
  }

  const getStatusStyle = (user: AdminUser) => {
    if (user.banned) {
      return 'bg-red-100 text-red-800'
    }
    if (!user.email_verified && !user.phone_verified) {
      return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (user: AdminUser) => {
    if (user.banned) return t('adminUsers.status.banned')
    if (!user.email_verified && !user.phone_verified) return t('adminUsers.status.unverified')
    return t('adminUsers.status.normal')
  }

  return (
    <AdminLayout title={t('adminUsers.layoutTitle')}>
      <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('adminUsers.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('adminUsers.description')}
            </p>
          </div>
          <PButton
            onClick={() => setShowCreateModal(true)}
            variant="primary"
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            {t('adminUsers.actions.addUser')}
          </PButton>
        </div>

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
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('adminUsers.stats.totalUsers')}</dt>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('adminUsers.stats.activeUsers')}</dt>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('adminUsers.stats.bannedUsers')}</dt>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">{t('adminUsers.stats.newThisMonth')}</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.new_users_this_month}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <PInput
                  type="text"
                  placeholder={t('adminUsers.filters.searchPlaceholder')}
                  value={params.search}
                  onChange={(e) => handleSearch(e.target.value)}
                  icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                />
              </div>

              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <PSelect
                  value={params.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusFilter(e.target.value as UserListParams['status'])}
                >
                  <option value="all">{t('adminUsers.filters.allStatus')}</option>
                  <option value="active">{t('adminUsers.filters.activeUsers')}</option>
                  <option value="banned">{t('adminUsers.status.banned')}</option>
                  <option value="verified">{t('adminUsers.filters.verified')}</option>
                  <option value="unverified">{t('adminUsers.status.unverified')}</option>
                </PSelect>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {(() => {
              const columns: PTableColumn<AdminUser>[] = [
                {
                  key: 'user',
                  title: t('adminUsers.table.user'),
                  render: (user) => (
                    <div className="flex items-center">
                      {user.avatar_url ? (
                        <img className="h-10 w-10 rounded-full object-cover" src={user.avatar_url} alt={user.nickname} />
                      ) : (
                        <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <UsersIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.nickname || t('adminUsers.table.noNickname')}</div>
                        <div className="text-sm text-gray-500">{t('adminUsers.table.id', { id: user.id })}</div>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'contact',
                  title: t('adminUsers.table.contact'),
                  render: (user) => (
                    <div>
                      <div className="text-sm text-gray-900">{user.email}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </div>
                  )
                },
                {
                  key: 'status',
                  title: t('adminUsers.table.status'),
                  render: (user) => (
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusStyle(user)}`}>
                        {getStatusText(user)}
                      </span>
                      <div className="flex gap-1">
                        {user.email_verified && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{t('adminUsers.table.emailVerified')}</span>
                        )}
                        {user.two_fa_enabled && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">2FA</span>
                        )}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'tenants',
                  title: t('adminUsers.table.tenants'),
                  render: (user) => (
                    <div className="text-sm text-gray-900">
                      {user.tenant_memberships.length > 0 ? (
                        <div className="space-y-1">
                          {user.tenant_memberships.slice(0, 2).map((m) => (
                            <div key={m.tenant_id} className="flex items-center gap-2">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{m.tenant_name}</span>
                              <span className="text-xs text-gray-500">({m.role})</span>
                            </div>
                          ))}
                          {user.tenant_memberships.length > 2 && (
                            <div className="text-xs text-gray-500">{t('adminUsers.table.moreTenants', { count: user.tenant_memberships.length - 2 })}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">{t('adminUsers.table.noTenants')}</span>
                      )}
                    </div>
                  )
                },
                { key: 'created_at', title: t('adminUsers.table.registeredAt'), dataIndex: 'created_at', sortable: true, sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
                {
                  key: 'actions',
                  title: t('adminUsers.table.actions'),
                  align: 'right',
                  render: (user) => (
                    <div className="flex items-center justify-end space-x-2">
                      <Link to={`/admin/users/${user.id}`} className="text-blue-600 hover:text-blue-800" title={t('adminUsers.actions.viewDetail')}>
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <PButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBanUser(user)}
                        className={user.banned ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}
                        title={user.banned ? t('adminUsers.actions.unbanUser') : t('adminUsers.actions.banUser')}
                      >
                        {user.banned ? <ShieldCheckIcon className="h-4 w-4" /> : <ShieldExclamationIcon className="h-4 w-4" />}
                      </PButton>
                      <PButton variant="ghost" size="sm" onClick={() => handleDeleteUser(user)} className="text-red-600 hover:text-red-800" title={t('adminUsers.actions.deleteUser')}>
                        <TrashIcon className="h-4 w-4" />
                      </PButton>
                    </div>
                  )
                },
              ]

              return (
                <PTable
                  columns={columns}
                  data={users}
                  rowKey={(row) => row.id}
                  loading={loading}
                  emptyText={t('adminUsers.empty.noData')}
                  defaultSort={{ key: 'created_at', order: 'desc' }}
                />
              )
            })()}
          </div>

          {!loading && pagination.total_pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <PButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  {t('adminUsers.pagination.prev')}
                </PButton>
                <PButton
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.total_pages}
                >
                  {t('adminUsers.pagination.next')}
                </PButton>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {t('adminUsers.pagination.summary', {
                      from: (pagination.page - 1) * pagination.limit + 1,
                      to: Math.min(pagination.page * pagination.limit, pagination.total),
                      total: pagination.total,
                    })}
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
                      {t('adminUsers.pagination.prev')}
                    </PButton>
                    
                    {/* Page buttons */}
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
                      {t('adminUsers.pagination.next')}
                    </PButton>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
            <div className="w-3/4 max-w-2xl p-6 border shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">{t('adminUsers.modal.createTitle')}</h2>
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
                <div className="grid grid-cols-2 gap-6">
                  <PInput
                    type="email"
                    label={<>{t('adminUsers.form.email')} <span className="text-red-500">*</span></>}
                    placeholder={t('adminUsers.form.emailPlaceholder')}
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  <PInput
                    type="tel"
                    label={t('adminUsers.form.phone')}
                    placeholder={t('adminUsers.form.phonePlaceholder')}
                    value={createForm.phone}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <PInput
                    type="password"
                    label={<>{t('adminUsers.form.password')} <span className="text-red-500">*</span></>}
                    placeholder={t('adminUsers.form.passwordPlaceholder')}
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                  <PInput
                    type="text"
                    label={t('adminUsers.form.nickname')}
                    placeholder={t('adminUsers.form.nicknamePlaceholder')}
                    value={createForm.nickname}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, nickname: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <PCheckbox
                    label={t('adminUsers.form.emailVerified')}
                    checked={createForm.email_verified}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email_verified: e.target.checked }))}
                  />
                  <PCheckbox
                    label={t('adminUsers.form.phoneVerified')}
                    checked={createForm.phone_verified}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, phone_verified: e.target.checked }))}
                  />
                </div>

                {createError && (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {createError}
                  </div>
                )}

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
                    {t('adminUsers.actions.cancel')}
                  </PButton>
                  <PButton
                    type="submit"
                    disabled={creating}
                    variant="primary"
                    loading={creating}
                  >
                    {t('adminUsers.actions.createUser')}
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
