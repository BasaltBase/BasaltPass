import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, useNavigate } from 'react-router-dom'
import {
  UsersIcon,
  UserIcon,
  ShieldCheckIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
  PlusIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import {
  adminTenantApi,
  AdminAdjustTenantUserWalletRequest,
  AdminTenantDetailResponse,
  AdminTenantUser,
  AdminTenantUserListRequest,
  AdminTenantInviteUserRequest,
  AdminTenantUpdateUserRequest,
  AdminTenantUserDetail
} from '@api/admin/tenant'
import { adminWalletApi, Currency } from '@api/admin/wallet'
import TenantUserDetailDrawer from '@features/admin/components/TenantUserDetailDrawer'
import Modal from '@ui/common/Modal'
import { PSkeleton, PBadge, PAlert, PPagination, PButton, PInput, PSelect, PPageHeader } from '@ui'
import { useI18n } from '@shared/i18n'

interface TenantUser extends AdminTenantUser {
}

const TenantUsers: React.FC = () => {
  const { t, locale } = useI18n()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tenant, setTenant] = useState<AdminTenantDetailResponse | null>(null)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [userType, setUserType] = useState<'all' | 'tenant_user' | 'app_user'>('all')
  const [role, setRole] = useState('')
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isInviteOpen, setInviteOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState<AdminTenantInviteUserRequest>({
    email: '',
    role: 'member',
    message: ''
  })
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [isDetailOpen, setDetailOpen] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [detailUser, setDetailUser] = useState<AdminTenantUserDetail | null>(null)
  const [isEditOpen, setEditOpen] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null)
  const [editForm, setEditForm] = useState<AdminTenantUpdateUserRequest>({
    role: 'member',
    status: 'active'
  })
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [isAdjustWalletOpen, setAdjustWalletOpen] = useState(false)
  const [adjustingUser, setAdjustingUser] = useState<TenantUser | null>(null)
  const [adjustWalletSubmitting, setAdjustWalletSubmitting] = useState(false)
  const [adjustWalletForm, setAdjustWalletForm] = useState<AdminAdjustTenantUserWalletRequest>({
    currency_code: '',
    amount: 0,
    reason: '',
    create_if_missing: true,
  })

  useEffect(() => {
    if (id) {
      fetchTenantDetail()
      loadUsers()
    }
  }, [id, page, search, userType, role])

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await adminWalletApi.getCurrencies()
        setCurrencies(response.data || [])
      } catch (error) {
        console.error(t('adminTenantUsers.logs.loadCurrenciesFailed'), error)
      }
    }
    loadCurrencies()
  }, [])

  const fetchTenantDetail = async () => {
    if (!id) return
    
    try {
      const response = await adminTenantApi.getTenantDetail(parseInt(id))
      setTenant(response)
    } catch (err: any) {
      console.error(t('adminTenantUsers.logs.fetchTenantDetailFailed'), err)
      setError(err.response?.data?.message || t('adminTenantUsers.errors.fetchTenantDetailFailed'))
    }
  }

  const loadUsers = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const params: AdminTenantUserListRequest = {
        page,
        limit: 20,
        search: search || undefined,
        user_type: userType === 'all' ? undefined : userType,
        role: role || undefined
      }

      const response = await adminTenantApi.getTenantUsers(parseInt(id), params)
      setUsers(response.users)
      setTotalPages(response.pagination.total_pages)
    } catch (error) {
      console.error('Failed to load users:', error)
      setError(t('adminTenantUsers.errors.loadUsersFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenInvite = () => {
    setInviteOpen(true)
    setAlert(null)
  }

  const handleInviteSubmit = async () => {
    if (!id) return

    try {
      setInviteSubmitting(true)
      await adminTenantApi.inviteTenantUser(parseInt(id), inviteForm)
      setAlert({ type: 'success', message: t('adminTenantUsers.messages.inviteSent') })
      setInviteOpen(false)
      setInviteForm({ email: '', role: 'member', message: '' })
      await loadUsers()
    } catch (error: any) {
      const message = error.response?.data?.error || error.response?.data?.message || t('adminTenantUsers.errors.inviteFailed')
      setAlert({ type: 'error', message })
    } finally {
      setInviteSubmitting(false)
    }
  }

  const handleViewDetail = async (userId: number) => {
    if (!id) return

    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError(null)
    setDetailUser(null)

    try {
      const response = await adminTenantApi.getTenantUserDetail(parseInt(id), userId)
      setDetailUser(response)
    } catch (error: any) {
      console.error('Failed to fetch user detail:', error)
      const message = error.response?.data?.error || error.response?.data?.message || t('adminTenantUsers.errors.fetchUserDetailFailed')
      setDetailError(message)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenEdit = (user: TenantUser) => {
    setEditingUser(user)
    setEditForm({
      role: user.role === 'owner' ? 'admin' : (user.role as 'admin' | 'member'),
      status: user.status
    })
    setEditOpen(true)
    setAlert(null)
  }

  const handleEditSubmit = async () => {
    if (!id || !editingUser) return

    try {
      setEditSubmitting(true)
      await adminTenantApi.updateTenantUser(parseInt(id), editingUser.id, editForm)
      setAlert({ type: 'success', message: t('adminTenantUsers.messages.userPermissionUpdated') })
      setEditOpen(false)
      setEditingUser(null)
      await loadUsers()
    } catch (error: any) {
      console.error('Failed to update user:', error)
      const message = error.response?.data?.error || error.response?.data?.message || t('adminTenantUsers.errors.updateUserPermissionFailed')
      setAlert({ type: 'error', message })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleRemoveUser = async (userId: number) => {
    if (!await uiConfirm(t('adminTenantUsers.confirm.removeUser'))) {
      return
    }

    if (!id) return

    try {
      await adminTenantApi.removeTenantUser(parseInt(id), userId)
      await loadUsers()
    } catch (error: any) {
      console.error('Failed to remove user:', error)
      const errorMessage = error.response?.data?.error || t('adminTenantUsers.errors.removeUserFailed')
      uiAlert(errorMessage)
    }
  }

  const handleOpenAdjustWallet = (user: TenantUser) => {
    setAdjustingUser(user)
    setAdjustWalletForm({
      currency_code: '',
      amount: 0,
      reason: '',
      create_if_missing: true,
    })
    setAdjustWalletOpen(true)
  }

  const handleAdjustWalletSubmit = async () => {
    if (!id || !adjustingUser) return
    if (!adjustWalletForm.currency_code) {
      uiAlert(t('adminTenantUsers.errors.selectCurrency'))
      return
    }
    if (!adjustWalletForm.reason.trim()) {
      uiAlert(t('adminTenantUsers.errors.inputReason'))
      return
    }
    if (!adjustWalletForm.amount) {
      uiAlert(t('adminTenantUsers.errors.amountNotZero'))
      return
    }

    try {
      setAdjustWalletSubmitting(true)
      await adminTenantApi.adjustTenantUserWallet(parseInt(id), adjustingUser.id, adjustWalletForm)
      setAlert({ type: 'success', message: t('adminTenantUsers.messages.walletAdjusted') })
      setAdjustWalletOpen(false)
    } catch (error: any) {
      console.error('Failed to adjust tenant user wallet:', error)
      const message = error.response?.data?.error || error.response?.data?.message || t('adminTenantUsers.errors.adjustWalletFailed')
      setAlert({ type: 'error', message })
    } finally {
      setAdjustWalletSubmitting(false)
    }
  }

  const getRoleBadge = (role: string, userType: string) => {
    if (userType === 'tenant_user') {
      switch (role) {
        case 'owner':
          return <PBadge variant="warning"><StarIcon className="h-3 w-3 mr-1" />{t('adminTenantUsers.role.owner')}</PBadge>
        case 'admin':
          return <PBadge variant="purple"><ShieldCheckIcon className="h-3 w-3 mr-1" />{t('adminTenantUsers.role.admin')}</PBadge>
        case 'member':
          return <PBadge variant="info"><UserIcon className="h-3 w-3 mr-1" />{t('adminTenantUsers.role.member')}</PBadge>
        default:
          return <PBadge variant="default">{role}</PBadge>
      }
    } else {
      return <PBadge variant="success">{t('adminTenantUsers.role.appUser')}</PBadge>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <PBadge variant="success">{t('adminTenantUsers.status.active')}</PBadge>
      case 'suspended': return <PBadge variant="error">{t('adminTenantUsers.status.suspended')}</PBadge>
      case 'banned': return <PBadge variant="error">{t('adminTenantUsers.status.banned')}</PBadge>
      default: return <PBadge variant="default">{status}</PBadge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading && !tenant) {
    return (
      <AdminLayout title={t('adminTenantUsers.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </AdminLayout>
    )
  }

  const actions = (
    <PButton onClick={handleOpenInvite} leftIcon={<PlusIcon className="h-4 w-4" />}>
      {t('adminTenantUsers.actions.addUser')}
    </PButton>
  )

  return (
    <AdminLayout title={t('adminTenantUsers.layoutTitleWithTenant', { tenant: tenant?.name || t('adminTenantUsers.common.tenant') })} actions={actions}>
      <div className="space-y-6">
        {alert && (
          <PAlert
            variant={alert.type === 'success' ? 'success' : 'error'}
            message={alert.message}
          />
        )}

        {error && <PAlert variant="error" message={error} />}

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/admin/tenants/${id}`)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <PPageHeader
            title={t('adminTenantUsers.header.title')}
            description={t('adminTenantUsers.header.description', { tenant: tenant?.name || '' })}
            icon={<UsersIcon className="h-8 w-8 text-indigo-600" />}
          />
        </div>

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <PInput
                type="text"
                placeholder={t('adminTenantUsers.filters.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<MagnifyingGlassIcon className="h-5 w-5" />}
                variant="rounded"
                autoComplete="off"
              />
            </div>
            <div className="sm:w-40">
              <PSelect
                value={userType}
                onChange={(e) => setUserType(e.target.value as any)}
              >
                <option value="all">{t('adminTenantUsers.filters.allUsers')}</option>
                <option value="tenant_user">{t('adminTenantUsers.filters.tenantAdmins')}</option>
                <option value="app_user">{t('adminTenantUsers.filters.appUsers')}</option>
              </PSelect>
            </div>
            <div className="sm:w-32">
              <PSelect
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="">{t('adminTenantUsers.filters.allRoles')}</option>
                <option value="owner">{t('adminTenantUsers.role.owner')}</option>
                <option value="admin">{t('adminTenantUsers.role.admin')}</option>
                <option value="member">{t('adminTenantUsers.role.member')}</option>
              </PSelect>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="py-4">
              <PSkeleton.List items={3} />
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {users.map((user) => (
                <li key={user.id}>
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                            <UserIcon className="h-6 w-6 text-indigo-600" />
                          </div>
                        </div>
                        <div className="ml-4 flex-1">
                          <div className="flex items-center">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {user.nickname || user.email}
                            </h3>
                            <div className="ml-3">
                              {getRoleBadge(user.role, user.user_type)}
                            </div>
                            <div className="ml-2">
                              {getStatusBadge(user.status)}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <span>{t('adminTenantUsers.meta.email', { email: user.email })}</span>
                            {user.app_name && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{t('adminTenantUsers.meta.app', { app: user.app_name })}</span>
                              </>
                            )}
                            <span className="mx-2">•</span>
                            <span>{t('adminTenantUsers.meta.joinedAt', { date: formatDate(user.created_at) })}</span>
                            {user.last_active_at && (
                              <>
                                <span className="mx-2">•</span>
                                <span>{t('adminTenantUsers.meta.lastActive', { date: formatDate(user.last_active_at) })}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetail(user.id)}
                        className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                        title={t('adminTenantUsers.actions.viewDetail')}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleOpenAdjustWallet(user)}
                        className="inline-flex items-center rounded-lg border border-amber-300 bg-white p-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                        title={t('adminTenantUsers.actions.adjustWallet')}
                      >
                        <CurrencyDollarIcon className="h-4 w-4" />
                      </button>
                      {user.role !== 'owner' && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="inline-flex items-center rounded-lg border border-gray-300 bg-white p-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                            title={t('adminTenantUsers.actions.editPermission')}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id)}
                            className="inline-flex items-center rounded-lg border border-red-300 bg-white p-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            title={t('adminTenantUsers.actions.removeUser')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">{t('adminTenantUsers.empty.noUsers')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || userType !== 'all' || role ? t('adminTenantUsers.empty.noMatchedUsers') : t('adminTenantUsers.empty.noUsersInTenant')}
              </p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <PPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>

      <InviteTenantUserModal
        open={isInviteOpen}
        formData={inviteForm}
        submitting={inviteSubmitting}
        onClose={() => setInviteOpen(false)}
        onChange={setInviteForm}
        onSubmit={handleInviteSubmit}
      />

      <EditTenantUserModal
        open={isEditOpen}
        user={editingUser}
        formData={editForm}
        submitting={editSubmitting}
        onClose={() => {
          setEditOpen(false)
          setEditingUser(null)
        }}
        onChange={setEditForm}
        onSubmit={handleEditSubmit}
      />

      <TenantUserDetailDrawer
        open={isDetailOpen}
        loading={detailLoading}
        user={detailUser}
        error={detailError}
        onClose={() => setDetailOpen(false)}
      />

      <AdjustTenantUserWalletModal
        open={isAdjustWalletOpen}
        user={adjustingUser}
        currencies={currencies}
        formData={adjustWalletForm}
        submitting={adjustWalletSubmitting}
        onClose={() => {
          setAdjustWalletOpen(false)
          setAdjustingUser(null)
        }}
        onChange={setAdjustWalletForm}
        onSubmit={handleAdjustWalletSubmit}
      />
    </AdminLayout>
  )
}

interface InviteTenantUserModalProps {
  open: boolean
  formData: AdminTenantInviteUserRequest
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  onChange: (data: AdminTenantInviteUserRequest) => void
}

const InviteTenantUserModal: React.FC<InviteTenantUserModalProps> = ({
  open,
  formData,
  submitting,
  onSubmit,
  onClose,
  onChange
}) => {
  const { t } = useI18n()
  return (
  <Modal
    open={open}
    title={t('adminTenantUsers.inviteModal.title')}
    onClose={onClose}
    description={t('adminTenantUsers.inviteModal.description')}
  >
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.inviteModal.email')} *</label>
        <input
          type="email"
          required
          value={formData.email}
          onChange={(event) => onChange({ ...formData, email: event.target.value })}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="user@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.inviteModal.role')} *</label>
        <select
          value={formData.role}
          onChange={(event) => onChange({ ...formData, role: event.target.value as 'admin' | 'member' })}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="member">{t('adminTenantUsers.role.member')}</option>
          <option value="admin">{t('adminTenantUsers.role.admin')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.inviteModal.messageOptional')}</label>
        <textarea
          value={formData.message || ''}
          onChange={(event) => onChange({ ...formData, message: event.target.value })}
          rows={3}
          className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          placeholder={t('adminTenantUsers.inviteModal.messagePlaceholder')}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>{t('adminTenantUsers.actions.cancel')}</PButton>
        <PButton type="submit" disabled={submitting} loading={submitting}>{t('adminTenantUsers.inviteModal.sendInvite')}</PButton>
      </div>
    </form>
  </Modal>
)
}

interface EditTenantUserModalProps {
  open: boolean
  user: TenantUser | null
  formData: AdminTenantUpdateUserRequest
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  onChange: (data: AdminTenantUpdateUserRequest) => void
}

const EditTenantUserModal: React.FC<EditTenantUserModalProps> = ({
  open,
  user,
  formData,
  submitting,
  onSubmit,
  onClose,
  onChange
}) => {
  const { t } = useI18n()
  const statusOptions = ['active', 'suspended', 'banned']
  const uniqueStatusOptions = user && !statusOptions.includes(user.status) ? [...statusOptions, user.status] : statusOptions

  return (
    <Modal
      open={open}
      title={user ? t('adminTenantUsers.editModal.titleWithUser', { user: user.nickname || user.email }) : t('adminTenantUsers.editModal.title')}
      onClose={onClose}
      description={t('adminTenantUsers.editModal.description')}
    >
      {user && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.fields.email')}</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.fields.role')}</label>
            <select
              value={formData.role || 'member'}
              onChange={(event) => onChange({ ...formData, role: event.target.value as 'admin' | 'member' })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="member">{t('adminTenantUsers.role.member')}</option>
              <option value="admin">{t('adminTenantUsers.role.admin')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.fields.status')}</label>
            <select
              value={formData.status || ''}
              onChange={(event) => onChange({ ...formData, status: event.target.value })}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {uniqueStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {translateStatusOption(option, t)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>{t('adminTenantUsers.actions.cancel')}</PButton>
            <PButton type="submit" disabled={submitting} loading={submitting}>{t('adminTenantUsers.actions.saveChanges')}</PButton>
          </div>
        </form>
      )}
    </Modal>
  )
}

interface AdjustTenantUserWalletModalProps {
  open: boolean
  user: TenantUser | null
  currencies: Currency[]
  formData: AdminAdjustTenantUserWalletRequest
  submitting: boolean
  onSubmit: () => void
  onClose: () => void
  onChange: (data: AdminAdjustTenantUserWalletRequest) => void
}

const AdjustTenantUserWalletModal: React.FC<AdjustTenantUserWalletModalProps> = ({
  open,
  user,
  currencies,
  formData,
  submitting,
  onSubmit,
  onClose,
  onChange
}) => {
  const { t } = useI18n()
  return (
  <Modal
    open={open}
    title={user ? t('adminTenantUsers.walletModal.titleWithUser', { user: user.nickname || user.email }) : t('adminTenantUsers.walletModal.title')}
    onClose={onClose}
    description={t('adminTenantUsers.walletModal.description')}
  >
    {user && (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.walletModal.userEmail')}</label>
          <input
            type="email"
            value={user.email}
            disabled
            className="block w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.walletModal.currency')} *</label>
          <select
            value={formData.currency_code}
            onChange={(event) => onChange({ ...formData, currency_code: event.target.value })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">{t('adminTenantUsers.walletModal.selectCurrency')}</option>
            {currencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.walletModal.amount')} *</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(event) => onChange({ ...formData, amount: Number(event.target.value) || 0 })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={t('adminTenantUsers.walletModal.amountPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminTenantUsers.walletModal.reason')} *</label>
          <textarea
            value={formData.reason}
            onChange={(event) => onChange({ ...formData, reason: event.target.value })}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder={t('adminTenantUsers.walletModal.reasonPlaceholder')}
          />
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formData.create_if_missing !== false}
            onChange={(event) => onChange({ ...formData, create_if_missing: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          {t('adminTenantUsers.walletModal.createIfMissing')}
        </label>

        <div className="flex justify-end space-x-3 pt-4">
          <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>{t('adminTenantUsers.actions.cancel')}</PButton>
          <PButton type="submit" disabled={submitting} loading={submitting}>{t('adminTenantUsers.actions.confirmAdjust')}</PButton>
        </div>
      </form>
    )}
  </Modal>
)
}

const translateStatusOption = (status: string, t: (key: string, params?: Record<string, any>) => string) => {
  switch (status) {
    case 'active':
      return t('adminTenantUsers.status.active')
    case 'suspended':
      return t('adminTenantUsers.status.suspended')
    case 'banned':
      return t('adminTenantUsers.status.banned')
    default:
      return status
  }
}

export default TenantUsers
