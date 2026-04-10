import React from 'react'
import { XMarkIcon, EnvelopeIcon, ClockIcon, ShieldCheckIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'
import { AdminTenantUserDetail } from '@api/admin/tenant'
import { useI18n } from '@shared/i18n'
import { PSkeleton } from '@ui'

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
  const { t, locale } = useI18n()

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 !m-0 z-50 flex justify-end">
      <div className="fixed inset-0 !m-0 bg-gray-900 bg-opacity-50" onClick={onClose} aria-hidden="true"></div>
      <div className="relative w-full max-w-xl bg-white shadow-xl h-full overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('adminTenantUserDetailDrawer.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('adminTenantUserDetailDrawer.description')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label={t('adminTenantUserDetailDrawer.actions.close')}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {loading && (
            <PSkeleton.List items={4} />
          )}

          {!loading && error && (
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && user && (
            <>
              <section>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('adminTenantUserDetailDrawer.sections.basicInfo')}</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.nickname')}</span>
                    <p className="mt-1">{user.nickname || t('adminTenantUserDetailDrawer.common.empty')}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.email')}</span>
                      <p className="mt-1 break-all">{user.email}</p>
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.userType')}</span>
                    <p className="mt-1">{user.user_type === 'tenant_user' ? t('adminTenantUserDetailDrawer.userType.tenantAdmin') : t('adminTenantUserDetailDrawer.userType.appUser')}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.role')}</span>
                    <p className="mt-1">{translateRole(user.role, t)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.status')}</span>
                    <p className="mt-1">{translateStatus(user.status, t)}</p>
                  </div>
                  {user.phone && (
                    <div className="flex items-center space-x-2">
                      <DevicePhoneMobileIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.phone')}</span>
                        <p className="mt-1">{user.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('adminTenantUserDetailDrawer.sections.timeInfo')}</h3>
                <div className="mt-3 space-y-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.createdAt')}</span>
                      <p className="mt-1">{formatDate(user.created_at, locale, t('adminTenantUserDetailDrawer.common.empty'))}</p>
                    </div>
                  </div>
                  {user.last_active_at && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.lastActive')}</span>
                        <p className="mt-1">{formatDate(user.last_active_at, locale, t('adminTenantUserDetailDrawer.common.empty'))}</p>
                      </div>
                    </div>
                  )}
                  {user.last_login_at && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="font-medium text-gray-900">{t('adminTenantUserDetailDrawer.fields.lastLogin')}</span>
                        <p className="mt-1">{formatDate(user.last_login_at, locale, t('adminTenantUserDetailDrawer.common.empty'))}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {user.permissions && user.permissions.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('adminTenantUserDetailDrawer.sections.permissions')}</h3>
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
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('adminTenantUserDetailDrawer.sections.apps')}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600">
                    {user.apps.map((app) => (
                      <li key={app.id} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2">
                        <div>
                          <p className="font-medium text-gray-900">{app.name}</p>
                          {app.role && <p className="text-xs text-gray-500 mt-0.5">{t('adminTenantUserDetailDrawer.meta.roleWithValue', { role: app.role })}</p>}
                        </div>
                        {app.added_at && <p className="text-xs text-gray-400">{t('adminTenantUserDetailDrawer.meta.joinedAtWithValue', { time: formatDate(app.added_at, locale, t('adminTenantUserDetailDrawer.common.empty')) })}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {user.extra_info && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{t('adminTenantUserDetailDrawer.sections.extraInfo')}</h3>
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

const translateRole = (role: string, t: (key: string, params?: Record<string, string | number>) => string) => {
  switch (role) {
    case 'owner':
      return t('adminTenantUserDetailDrawer.role.owner')
    case 'admin':
      return t('adminTenantUserDetailDrawer.role.admin')
    case 'member':
      return t('adminTenantUserDetailDrawer.role.member')
    default:
      return role
  }
}

const translateStatus = (status: string, t: (key: string, params?: Record<string, string | number>) => string) => {
  switch (status) {
    case 'active':
      return t('adminTenantUserDetailDrawer.status.active')
    case 'suspended':
      return t('adminTenantUserDetailDrawer.status.suspended')
    case 'banned':
      return t('adminTenantUserDetailDrawer.status.banned')
    default:
      return status
  }
}

const formatDate = (value: string | undefined, locale: string, emptyLabel: string) => {
  if (!value) {
    return emptyLabel
  }

  return new Date(value).toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default TenantUserDetailDrawer
