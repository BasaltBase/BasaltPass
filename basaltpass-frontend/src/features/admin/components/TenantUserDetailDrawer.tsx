import React from 'react'
import { XMarkIcon, EnvelopeIcon, ClockIcon, ShieldCheckIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { AdminTenantUserDetail } from '@api/admin/tenant'

interface TenantUserDetailDrawerProps {
  open: boolean
  loading: boolean
  user?: AdminTenantUserDetail | null
  error?: string | null
  onClose: () => void
}

const TenantUserDetailDrawer: React.FC<TenantUserDetailDrawerProps> = ({
  open,
  loading,
  user,
  error,
  onClose
}) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50" onClick={onClose} aria-hidden="true"></div>
      <div className="relative w-full max-w-xl bg-white shadow-xl h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">用户详情</h2>
            <p className="mt-1 text-sm text-gray-500">查看租户用户的基本信息和关联数据</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="关闭">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && user && (
            <>
              <section>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">基本信息</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">昵称</span>
                    <p className="mt-1">{user.nickname || '—'}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-900">邮箱</span>
                      <p className="mt-1 break-all">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">用户类型</span>
                    <p className="mt-1">{user.user_type === 'tenant_admin' ? '租户管理员' : '应用用户'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">角色</span>
                    <p className="mt-1">{translateRole(user.role)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">状态</span>
                    <p className="mt-1">{translateStatus(user.status)}</p>
                  </div>
                  {user.phone && (
                    <div className="flex items-center space-x-2">
                      <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">手机号</span>
                        <p className="mt-1">{user.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">时间信息</h3>
                <div className="mt-3 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-900">创建时间</span>
                      <p className="mt-1">{formatDate(user.created_at)}</p>
                    </div>
                  </div>
                  {user.last_active_at && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">最后活跃</span>
                        <p className="mt-1">{formatDate(user.last_active_at)}</p>
                      </div>
                    </div>
                  )}
                  {user.last_login_at && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">最近登录</span>
                        <p className="mt-1">{formatDate(user.last_login_at)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {user.permissions && user.permissions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">权限</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {user.permissions.map((permission) => (
                      <span
                        key={permission}
                        className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium"
                      >
                        <ShieldCheckIcon className="w-4 h-4 mr-1" />
                        {permission}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {user.apps && user.apps.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">关联应用</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    {user.apps.map((app) => (
                      <li key={app.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                        <div>
                          <p className="font-medium text-gray-900">{app.name}</p>
                          {app.role && <p className="text-xs text-gray-500 mt-0.5">角色: {app.role}</p>}
                        </div>
                        {app.added_at && <p className="text-xs text-gray-400">加入时间: {formatDate(app.added_at)}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {user.extra_info && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">附加信息</h3>
                  <div className="mt-3 text-sm text-gray-600 space-y-2">
                    {Object.entries(user.extra_info).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium text-gray-900">{key}</span>
                        <p className="mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const translateRole = (role: string) => {
  switch (role) {
    case 'owner':
      return '所有者'
    case 'admin':
      return '管理员'
    case 'member':
      return '成员'
    default:
      return role
  }
}

const translateStatus = (status: string) => {
  switch (status) {
    case 'active':
      return '活跃'
    case 'suspended':
      return '暂停'
    case 'banned':
      return '封禁'
    default:
      return status
  }
}

const formatDate = (value?: string) => {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default TenantUserDetailDrawer
