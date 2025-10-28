import { useCallback, useEffect, useState } from 'react'
import Layout from '../../../components/Layout'
import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import client from '../../../api/client'

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
      const message = err.response?.data?.error || err.message || '获取登录历史失败'
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
            正在加载...
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
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                重试
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
            暂无登录记录
          </td>
        </tr>
      )
    }

    return records.map((record) => {
      const formattedDate = new Date(record.created_at).toLocaleString()
      return (
        <tr key={record.id} className="border-t">
          <td className="px-4 py-3 text-sm text-gray-900">{formattedDate}</td>
          <td className="px-4 py-3 text-sm text-gray-600">{record.ip || '未知'}</td>
          <td className="px-4 py-3 text-sm text-gray-600">
            <div className="max-w-xs truncate" title={record.user_agent || '未知设备'}>
              {record.user_agent || '未知设备'}
            </div>
          </td>
          <td className="px-4 py-3 text-sm">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              record.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {record.status === 'success' ? '成功' : record.status}
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
              to="/security"
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">登录历史</h1>
              <p className="mt-1 text-sm text-gray-500">查看您最近的登录活动，保障账户安全</p>
            </div>
          </div>

          <div className="bg-white shadow rounded">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP地址</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">设备/浏览器</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
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
                  第 {pagination.page} / {Math.max(pagination.total_pages, 1)} 页，共 {pagination.total} 条记录
                </p>
                <div className="space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page <= 1 || isLoading}
                    className="px-4 py-2 text-sm font-medium border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.total_pages > 0 && pagination.page >= pagination.total_pages || isLoading}
                    className="px-4 py-2 text-sm font-medium border rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
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
