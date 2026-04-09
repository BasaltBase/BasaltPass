import { useCallback, useEffect, useState } from 'react'
import Layout from '@features/user/components/Layout'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import client from '@api/client'
import { ROUTES } from '@constants'
import { PButton, PPageHeader } from '@ui'
import { useI18n } from '@shared/i18n'

interface LoginHistoryItem {
  id: number
  ip: string
  user_agent?: string
  status: string
  created_at: string
}

interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export default function LoginHistory() {
  const { t, locale } = useI18n()
  const [records, setRecords] = useState<LoginHistoryItem[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLoginHistory = useCallback(async (page: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await client.get('/api/v1/security/login-history', {
        params: {
          page,
          page_size: pagination.page_size,
        },
      })
      const data = response.data?.data ?? []
      const paginationInfo = response.data?.pagination ?? {}
      const nextPageSize = paginationInfo.page_size ?? pagination.page_size
      const total = paginationInfo.total ?? data.length
      const totalPagesFromApi = paginationInfo.total_pages ?? 0
      const calculatedTotalPages = nextPageSize > 0 ? Math.max(Math.ceil(total / nextPageSize), 1) : 1

      setRecords(data)
      setPagination({
        page: paginationInfo.page ?? page,
        page_size: nextPageSize,
        total,
        total_pages: totalPagesFromApi || calculatedTotalPages,
      })
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || t('pages.userLoginHistory.errors.loadFailed')
      setError(message)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page_size])

  useEffect(() => {
    fetchLoginHistory(pagination.page)
  }, [fetchLoginHistory, pagination.page])

  const handlePageChange = (page: number) => {
    if (page < 1 || (pagination.total_pages && page > pagination.total_pages)) return
    setPagination((prev) => ({ ...prev, page }))
  }

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
            {t('pages.userLoginHistory.table.loading')}
          </td>
        </tr>
      )
    }

    if (error) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-red-500">
            <div className="space-y-3">
              <p>{error}</p>
              <button
                onClick={() => fetchLoginHistory(pagination.page)}
                className="inline-flex items-center rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                {t('pages.userLoginHistory.actions.retry')}
              </button>
            </div>
          </td>
        </tr>
      )
    }

    if (!records.length) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
            {t('pages.userLoginHistory.table.empty')}
          </td>
        </tr>
      )
    }

    return records.map((record) => {
      const formattedDate = new Date(record.created_at).toLocaleString(locale)
      return (
        <tr key={record.id} className="border-t">
          <td className="px-4 py-3 text-sm text-gray-900">{formattedDate}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{record.ip || t('pages.userLoginHistory.table.unknown')}</td>
          <td className="px-4 py-3 text-sm text-gray-600">
            <div className="max-w-xs truncate" title={record.user_agent || t('pages.userLoginHistory.table.unknownDevice')}>
              {record.user_agent || t('pages.userLoginHistory.table.unknownDevice')}
            </div>
          </td>
          <td className="px-4 py-3 text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              record.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {record.status === 'success' ? t('pages.userLoginHistory.table.success') : record.status}
            </span>
          </td>
        </tr>
      )
    })
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center">
            <Link
              to={ROUTES.user.security}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <PPageHeader title={t('pages.userLoginHistory.header.title')} description={t('pages.userLoginHistory.header.description')} />
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.userLoginHistory.table.time')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.userLoginHistory.table.ip')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.userLoginHistory.table.device')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('pages.userLoginHistory.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {renderTableBody()}
                </tbody>
              </table>
            </div>

            {records.length > 0 && !error && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {t('pages.userLoginHistory.pagination.summary', {
                    page: pagination.page,
                    totalPages: Math.max(pagination.total_pages, 1),
                    total: pagination.total,
                  })}
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || isLoading}
                    className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('pages.userLoginHistory.pagination.prev')}
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.total_pages > 0 && pagination.page >= pagination.total_pages || isLoading}
                    className="rounded-lg border px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t('pages.userLoginHistory.pagination.next')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
