import { useEffect, useState } from 'react'
import { ExclamationTriangleIcon, MagnifyingGlassIcon, UserPlusIcon, UsersIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import TenantLayout from '@features/tenant/components/TenantLayout'
import { PButton, PEmptyState, PInput, PPageHeader, PSkeleton } from '@ui'
import PTable from '@ui/PTable'
import { uiConfirm } from '@contexts/DialogContext'
import useDebounce from '@hooks/useDebounce'
import { tenantUserManagementApi, type GlobalUserCandidate } from '@api/tenant/tenantUserManagement'
import { useI18n } from '@shared/i18n'

export default function TenantGlobalUserAuthorization() {
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(true)
  const [submittingUserId, setSubmittingUserId] = useState<number | null>(null)
  const [users, setUsers] = useState<GlobalUserCandidate[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const debouncedSearch = useDebounce(searchTerm, 250)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  })

  const fetchGlobalUsers = async (page = 1, pageSize = 20) => {
    try {
      setLoading(true)
      setError('')
      const response = await tenantUserManagementApi.getGlobalUserCandidates({
        page,
        limit: pageSize,
        search: debouncedSearch,
      })
      setUsers(response.users || [])
      setPagination({
        current: page,
        pageSize,
        total: response.pagination?.total || 0,
      })
    } catch (err: any) {
      setError(err?.response?.data?.error || t('tenantGlobalUserAuthorization.errors.fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGlobalUsers(1, pagination.pageSize)
  }, [debouncedSearch])

  const handleAuthorize = async (user: GlobalUserCandidate) => {
    const confirmed = await uiConfirm(t('tenantGlobalUserAuthorization.confirm.authorizeUser', { email: user.email }))
    if (!confirmed) {
      return
    }

    try {
      setSubmittingUserId(user.id)
      await tenantUserManagementApi.authorizeGlobalUser(user.id)
      await fetchGlobalUsers(pagination.current, pagination.pageSize)
    } catch (err: any) {
      setError(err?.response?.data?.error || t('tenantGlobalUserAuthorization.errors.authorizeFailed'))
    } finally {
      setSubmittingUserId(null)
    }
  }

  if (loading) {
    return (
      <TenantLayout title={t('tenantGlobalUserAuthorization.page.title')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout title={t('tenantGlobalUserAuthorization.page.title')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantGlobalUserAuthorization.page.title')}
          description={t('tenantGlobalUserAuthorization.page.subtitle')}
          icon={<UsersIcon className="h-8 w-8 text-blue-600" />}
          actions={<PButton onClick={() => fetchGlobalUsers(pagination.current, pagination.pageSize)}>{t('tenantGlobalUserAuthorization.actions.refresh')}</PButton>}
        />

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <div className="max-w-lg">
            <PInput
              type="text"
              placeholder={t('tenantGlobalUserAuthorization.filters.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<MagnifyingGlassIcon className="h-5 w-5" />}
            />
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              {t('tenantGlobalUserAuthorization.list.title', { count: users.length })}
            </h3>

            {users.length === 0 ? (
              <PEmptyState
                icon={UsersIcon}
                title={t('tenantGlobalUserAuthorization.empty.title')}
                description={t('tenantGlobalUserAuthorization.empty.description')}
              />
            ) : (
              <>
                <PTable
                  columns={[
                    {
                      key: 'user',
                      title: t('tenantGlobalUserAuthorization.table.user'),
                      render: (user: GlobalUserCandidate) => (
                        <div className="flex items-center">
                          {user.avatar ? (
                            <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.nickname || user.email} />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <UsersIcon className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.nickname || t('tenantGlobalUserAuthorization.common.noNickname')}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'created_at',
                      title: t('tenantGlobalUserAuthorization.table.createdAt'),
                      render: (user: GlobalUserCandidate) => (
                        <span className="text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString(locale)}</span>
                      )
                    },
                    {
                      key: 'actions',
                      title: t('tenantGlobalUserAuthorization.table.actions'),
                      align: 'right',
                      render: (user: GlobalUserCandidate) => (
                        <PButton
                          size="sm"
                          onClick={() => handleAuthorize(user)}
                          disabled={submittingUserId === user.id}
                          leftIcon={submittingUserId === user.id ? <ExclamationTriangleIcon className="h-4 w-4" /> : <UserPlusIcon className="h-4 w-4" />}
                        >
                          {submittingUserId === user.id
                            ? t('tenantGlobalUserAuthorization.actions.authorizing')
                            : t('tenantGlobalUserAuthorization.actions.authorize')}
                        </PButton>
                      )
                    },
                  ]}
                  data={users}
                  rowKey={(row) => row.id}
                />

                {users.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        {t('tenantGlobalUserAuthorization.pagination.showing', {
                          start: ((pagination.current - 1) * pagination.pageSize) + 1,
                          end: Math.min(pagination.current * pagination.pageSize, pagination.total),
                          total: pagination.total,
                        })}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => fetchGlobalUsers(pagination.current - 1, pagination.pageSize)}
                          disabled={pagination.current <= 1}
                          className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          <ChevronLeftIcon className="w-4 h-4" />
                        </button>
                        <span className="px-3 py-1 text-sm">
                          {t('tenantGlobalUserAuthorization.pagination.pageInfo', {
                            current: pagination.current,
                            total: Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
                          })}
                        </span>
                        <button
                          onClick={() => fetchGlobalUsers(pagination.current + 1, pagination.pageSize)}
                          disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                          className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          <ChevronRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
