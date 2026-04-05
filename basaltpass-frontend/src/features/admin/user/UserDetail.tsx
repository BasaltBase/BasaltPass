import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { adminUserApi, type AdminUserDetail } from '@api/admin/user'
import { adminTenantApi, type AdminAdjustTenantUserWalletRequest } from '@api/admin/tenant'
import { adminWalletApi, type Currency } from '@api/admin/wallet'
import { 
  ChevronRightIcon, 
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
  CubeIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { listRoles, type AdminRole } from '@api/admin/roles'
import { ROUTES } from '@constants'
import { PBadge, PButton } from '@ui'
import Modal from '@ui/common/Modal'

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showBanModal, setShowBanModal] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [showAssignRole, setShowAssignRole] = useState(false)
  const [roles, setRoles] = useState<AdminRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [showAdjustWallet, setShowAdjustWallet] = useState(false)
  const [selectedMembership, setSelectedMembership] = useState<AdminUserDetail['tenant_memberships'][number] | null>(null)
  const [adjustWalletSubmitting, setAdjustWalletSubmitting] = useState(false)
  const [adjustWalletForm, setAdjustWalletForm] = useState<AdminAdjustTenantUserWalletRequest>({
    currency_code: '',
    amount: 0,
    reason: '',
    create_if_missing: true,
  })

  useEffect(() => {
    if (id) {
      loadUser(parseInt(id))
    }
  }, [id])

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await adminWalletApi.getCurrencies()
        setCurrencies(response.data || [])
      } catch (error) {
        console.error('加载货币列表失败:', error)
      }
    }
    loadCurrencies()
  }, [])

  const loadUser = async (userId: number) => {
    try {
      setLoading(true)
      const userDetail = await adminUserApi.getUser(userId)
      setUser(userDetail)
    } catch (error) {
      console.error('加载用户详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!user) return
    
    try {
      await adminUserApi.banUser(user.id, {
        banned: !user.banned,
        reason: banReason || (user.banned ? '解封用户' : '管理员操作')
      })
      setShowBanModal(false)
      setBanReason('')
      loadUser(user.id)
    } catch (error) {
      console.error('操作失败:', error)
    }
  }

  const openAssignRole = async () => {
    try {
      const r = await listRoles()
  // 兼容“全局角色”识别：is_system 为 true 或 tenant_id 为 0/空
  const all = r.data || []
  const globals = all.filter(x => x.is_system || !x.tenant_id || x.tenant_id === 0)
  const toShow = globals.length > 0 ? globals : all
  setRoles(toShow)
  setSelectedRoleId(toShow[0]?.ID ?? null)
      setShowAssignRole(true)
    } catch (e) {
      console.error('加载角色失败', e)
    }
  }

  const submitAssignRole = async () => {
    if (!user || !selectedRoleId) return
    try {
      await adminUserApi.assignGlobalRole(user.id, { role_id: selectedRoleId })
      setShowAssignRole(false)
      await loadUser(user.id)
    } catch (e) {
      console.error('分配角色失败', e)
      uiAlert('分配角色失败')
    }
  }

  const handleDeleteUser = async () => {
    if (!user) return
    
    if (!await uiConfirm(`确定要删除用户 ${user.nickname || user.email} 吗？此操作不可恢复。`)) {
      return
    }
    
    try {
      await adminUserApi.deleteUser(user.id)
      navigate(ROUTES.admin.users)
    } catch (error) {
      console.error('删除用户失败:', error)
    }
  }

  const handleOpenAdjustWallet = (membership: AdminUserDetail['tenant_memberships'][number]) => {
    setSelectedMembership(membership)
    setAdjustWalletForm({
      currency_code: '',
      amount: 0,
      reason: '',
      create_if_missing: true,
    })
    setShowAdjustWallet(true)
  }

  const handleAdjustWalletSubmit = async () => {
    if (!user || !selectedMembership) return
    if (!adjustWalletForm.currency_code) {
      uiAlert('请选择货币类型')
      return
    }
    if (!adjustWalletForm.reason.trim()) {
      uiAlert('请输入调整原因')
      return
    }
    if (!adjustWalletForm.amount) {
      uiAlert('调整金额不能为 0')
      return
    }

    try {
      setAdjustWalletSubmitting(true)
      await adminTenantApi.adjustTenantUserWallet(selectedMembership.tenant_id, user.id, adjustWalletForm)
      setShowAdjustWallet(false)
      await loadUser(user.id)
    } catch (error: any) {
      console.error('调整用户钱包失败:', error)
      uiAlert(error.response?.data?.error || error.response?.data?.message || '调整用户钱包失败')
    } finally {
      setAdjustWalletSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'banned': return 'text-red-600 bg-red-100'
      case 'suspended': return 'text-yellow-600 bg-yellow-100'
      case 'restricted': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="用户详情">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-500">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  if (!user) {
    return (
      <AdminLayout title="用户详情">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-500">用户不存在</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="用户详情">
      <div className="space-y-6">

        {/* 用户基本信息 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center">
              {user.avatar_url ? (
                <img
                  className="h-16 w-16 rounded-full object-cover"
                  src={user.avatar_url}
                  alt={user.nickname}
                />
              ) : (
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <UserCircleIcon className="h-10 w-10 text-gray-400" />
                </div>
              )}
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.nickname || '未设置昵称'}
                </h1>
                <p className="text-sm text-gray-500">ID: {user.id}</p>
                <div className="mt-2 flex items-center gap-2">
                  <PBadge variant={user.banned ? 'error' : 'success'}>
                    {user.banned ? '已封禁' : '正常'}
                  </PBadge>
                  {user.email_verified && (
                    <PBadge variant="info">邮箱已验证</PBadge>
                  )}
                  {user.two_fa_enabled && (
                    <PBadge variant="success">启用2FA</PBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <PButton
                onClick={() => setShowBanModal(true)}
                variant={user.banned ? 'primary' : 'danger'}
                leftIcon={user.banned ? <ShieldCheckIcon className="h-4 w-4" /> : <ShieldExclamationIcon className="h-4 w-4" />}
              >
                {user.banned ? '解封用户' : '封禁用户'}
              </PButton>
              <PButton
                onClick={openAssignRole}
                variant="primary"
                leftIcon={<KeyIcon className="h-4 w-4" />}
              >
                分配全局角色
              </PButton>
              <PButton
                onClick={handleDeleteUser}
                variant="danger"
                leftIcon={<TrashIcon className="h-4 w-4" />}
              >
                删除用户
              </PButton>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">基本信息</h3>
                <dl className="space-y-3">
                  <div className="flex items-center">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-20">
                      <EnvelopeIcon className="h-4 w-4 mr-2" />
                      邮箱
                    </dt>
                    <dd className="text-sm text-gray-900 ml-4">{user.email}</dd>
                    {user.email_verified ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-500 ml-2" />
                    )}
                  </div>
                  {user.phone && (
                    <div className="flex items-center">
                      <dt className="flex items-center text-sm font-medium text-gray-500 w-20">
                        <PhoneIcon className="h-4 w-4 mr-2" />
                        手机
                      </dt>
                      <dd className="text-sm text-gray-900 ml-4">{user.phone}</dd>
                      {user.phone_verified ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" />
                      ) : (
                        <XCircleIcon className="h-4 w-4 text-red-500 ml-2" />
                      )}
                    </div>
                  )}
                  <div className="flex items-center">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-20">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      注册
                    </dt>
                    <dd className="text-sm text-gray-900 ml-4">{formatDate(user.created_at)}</dd>
                  </div>
                  <div className="flex items-center">
                    <dt className="flex items-center text-sm font-medium text-gray-500 w-20">
                      <KeyIcon className="h-4 w-4 mr-2" />
                      安全
                    </dt>
                    <dd className="text-sm text-gray-900 ml-4">
                      {user.two_fa_enabled ? '已启用两步验证' : '未启用两步验证'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">活动统计</h3>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-gray-500">总登录次数</dt>
                    <dd className="text-sm text-gray-900">{user.activity_stats.total_logins}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-gray-500">使用的应用数</dt>
                    <dd className="text-sm text-gray-900">{user.activity_stats.total_apps_used}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-gray-500">活跃应用数</dt>
                    <dd className="text-sm text-gray-900">{user.activity_stats.active_apps_count}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-gray-500">加入团队数</dt>
                    <dd className="text-sm text-gray-900">{user.activity_stats.teams_count}</dd>
                  </div>
                  {user.activity_stats.last_login_at && (
                    <div className="flex items-center justify-between">
                      <dt className="text-sm font-medium text-gray-500">最后登录</dt>
                      <dd className="text-sm text-gray-900">{formatDate(user.activity_stats.last_login_at)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 租户成员身份 */}
        {user.tenant_memberships.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                租户成员身份
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid gap-4">
                {user.tenant_memberships.map((membership) => (
                  <div key={membership.tenant_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{membership.tenant_name}</h4>
                      <p className="text-sm text-gray-500">代码: {membership.tenant_code}</p>
                      <p className="text-sm text-gray-500">加入时间: {formatDate(membership.joined_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <PBadge variant="info">{membership.role}</PBadge>
                      <PButton
                        variant="secondary"
                        size="sm"
                        leftIcon={<CurrencyDollarIcon className="h-4 w-4" />}
                        onClick={() => handleOpenAdjustWallet(membership)}
                      >
                        调整钱包
                      </PButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 分配全局角色 */}
        {showAssignRole && (
          <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-[480px] shadow-lg rounded-md bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">分配全局角色</h3>
                <p className="text-sm text-gray-500 mt-1">仅可分配“全局角色”（tenant_id 为空或 0）。</p>
              </div>
              <div className="space-y-3">
                <label className="text-sm text-gray-700">选择角色</label>
                <select className="w-full border rounded px-3 py-2" value={selectedRoleId ?? ''} onChange={(e)=>setSelectedRoleId(Number(e.target.value))}>
                  <option value="" disabled>请选择角色</option>
                  {roles.map(r => (
                    <option key={r.ID} value={r.ID}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <PButton variant="secondary" onClick={() => setShowAssignRole(false)}>取消</PButton>
                <PButton disabled={!selectedRoleId} onClick={submitAssignRole}>确认分配</PButton>
              </div>
            </div>
          </div>
        )}

        {/* 全局角色 */}
        {user.global_roles.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <GlobeAltIcon className="h-5 w-5 mr-2" />
                全局角色
              </h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid gap-4">
                {user.global_roles.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{role.name}</h4>
                      <p className="text-sm text-gray-500">代码: {role.code}</p>
                      <p className="text-sm text-gray-500">{role.description}</p>
                    </div>
                    <button
                      onClick={() => adminUserApi.removeGlobalRole(user.id, role.id).then(() => loadUser(user.id))}
                      className="text-red-600 hover:text-red-800"
                      title="移除角色"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 应用授权 */}
        {user.app_authorizations.length > 0 && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <CubeIcon className="h-5 w-5 mr-2" />
                应用授权
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      应用
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      租户
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      首次授权
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      最后活跃
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {user.app_authorizations.map((auth) => (
                    <tr key={auth.app_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{auth.app_name}</div>
                        <div className="text-sm text-gray-500">ID: {auth.app_id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{auth.tenant_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PBadge variant={auth.status === 'active' ? 'success' : auth.status === 'suspended' ? 'warning' : 'error'}>
                          {auth.status}
                        </PBadge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(auth.first_authorized_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {auth.last_active_at ? formatDate(auth.last_active_at) : '从未活跃'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 封禁模态框 */}
        {showBanModal && (
          <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center mb-4">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">
                    {user.banned ? '解封用户' : '封禁用户'}
                  </h3>
                </div>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500 mb-4">
                    {user.banned 
                      ? `确定要解封用户 ${user.nickname || user.email} 吗？`
                      : `确定要封禁用户 ${user.nickname || user.email} 吗？`
                    }
                  </p>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md resize-none"
                    rows={3}
                    placeholder="请输入操作原因（可选）"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <PButton
                    variant="secondary"
                    onClick={() => {
                      setShowBanModal(false)
                      setBanReason('')
                    }}
                  >
                    取消
                  </PButton>
                  <PButton
                    variant={user.banned ? 'primary' : 'danger'}
                    onClick={handleBanUser}
                  >
                    确认{user.banned ? '解封' : '封禁'}
                  </PButton>
                </div>
              </div>
            </div>
          </div>
        )}

        <AdjustUserTenantWalletModal
          open={showAdjustWallet}
          user={user}
          membership={selectedMembership}
          currencies={currencies}
          formData={adjustWalletForm}
          submitting={adjustWalletSubmitting}
          onClose={() => {
            setShowAdjustWallet(false)
            setSelectedMembership(null)
          }}
          onChange={setAdjustWalletForm}
          onSubmit={handleAdjustWalletSubmit}
        />
      </div>
    </AdminLayout>
  )
}

interface AdjustUserTenantWalletModalProps {
  open: boolean
  user: AdminUserDetail | null
  membership: AdminUserDetail['tenant_memberships'][number] | null
  currencies: Currency[]
  formData: AdminAdjustTenantUserWalletRequest
  submitting: boolean
  onClose: () => void
  onChange: (data: AdminAdjustTenantUserWalletRequest) => void
  onSubmit: () => void
}

const AdjustUserTenantWalletModal: React.FC<AdjustUserTenantWalletModalProps> = ({
  open,
  user,
  membership,
  currencies,
  formData,
  submitting,
  onClose,
  onChange,
  onSubmit,
}) => (
  <Modal
    open={open}
    title={membership ? `调整钱包余额 - ${membership.tenant_name}` : '调整钱包余额'}
    onClose={onClose}
    description="为该用户在指定租户下直接调整任意币种的钱包余额。正数表示增加，负数表示减少。"
  >
    {user && membership ? (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className="space-y-4"
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">用户</label>
          <input
            type="text"
            value={`${user.nickname || '未设置昵称'} (${user.email})`}
            disabled
            className="block w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">租户</label>
          <input
            type="text"
            value={`${membership.tenant_name} (${membership.tenant_code})`}
            disabled
            className="block w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-gray-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">货币类型 *</label>
          <select
            value={formData.currency_code}
            onChange={(event) => onChange({ ...formData, currency_code: event.target.value })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">选择货币</option>
            {currencies.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code} - {currency.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">调整金额 *</label>
          <input
            type="number"
            step="0.01"
            value={formData.amount}
            onChange={(event) => onChange({ ...formData, amount: Number(event.target.value) || 0 })}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="正数增加，负数减少"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">调整原因 *</label>
          <textarea
            value={formData.reason}
            onChange={(event) => onChange({ ...formData, reason: event.target.value })}
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="例如：手工补偿、人工扣费、账务修正"
          />
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={formData.create_if_missing !== false}
            onChange={(event) => onChange({ ...formData, create_if_missing: event.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          该币种钱包不存在时自动创建
        </label>

        <div className="flex justify-end gap-3 pt-4">
          <PButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            取消
          </PButton>
          <PButton type="submit" disabled={submitting} loading={submitting}>
            确认调整
          </PButton>
        </div>
      </form>
    ) : null}
  </Modal>
)
