import React, { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { invitationApi, Invitation } from '../../api/invitation'
import { CheckIcon, XMarkIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline'

const Inbox: React.FC = () => {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 10

  const load = async (page = 1) => {
    setLoading(true)
    try {
      const response = await invitationApi.listIncoming()
      const allInvitations = response.data
      
      // 模拟分页（实际应该由后端实现）
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedInvitations = allInvitations.slice(startIndex, endIndex)
      
      setInvitations(paginatedInvitations)
      setTotalPages(Math.ceil(allInvitations.length / pageSize))
      setCurrentPage(page)
    } catch (error) {
      console.error('加载邀请失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleAction = async (inv: Invitation, action: 'accept' | 'reject') => {
    setActionLoading(inv.id)
    try {
      if (action === 'accept') {
        await invitationApi.accept(inv.id)
      } else {
        await invitationApi.reject(inv.id)
      }
      load(currentPage) // 重新加载当前页
    } catch (error: any) {
      alert(error.response?.data?.message || `${action === 'accept' ? '接受' : '拒绝'}邀请失败`)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: '待处理', class: 'bg-yellow-100 text-yellow-800' },
      accepted: { text: '已接受', class: 'bg-green-100 text-green-800' },
      rejected: { text: '已拒绝', class: 'bg-red-100 text-red-800' },
      revoked: { text: '已撤回', class: 'bg-gray-100 text-gray-800' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
        {config.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">我的邀请函</h1>
            <p className="mt-1 text-sm text-gray-500">
              查看和管理您收到的团队邀请
            </p>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <ClockIcon className="w-4 h-4 mr-1" />
            总共 {invitations.length} 条邀请
          </div>
        </div>

        {/* 邀请列表 */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无邀请</h3>
            <p className="mt-1 text-sm text-gray-500">
              您目前没有收到任何团队邀请
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {invitations.map((inv) => (
                <li key={inv.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <UserGroupIcon className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              来自团队 "{inv.team?.name}" 的邀请
                            </p>
                            {getStatusBadge(inv.status)}
                          </div>
                          <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500">
                            <span>邀请人：{inv.inviter?.nickname || inv.inviter?.email}</span>
                            <span>•</span>
                            <span>{formatDate(inv.created_at)}</span>
                          </div>
                          {inv.remark && (
                            <p className="mt-1 text-sm text-gray-600 italic">
                              "{inv.remark}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    {inv.status === 'pending' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleAction(inv, 'accept')}
                          disabled={actionLoading === inv.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {actionLoading === inv.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1" />
                          ) : (
                            <CheckIcon className="h-3 w-3 mr-1" />
                          )}
                          接受
                        </button>
                        <button
                          onClick={() => handleAction(inv, 'reject')}
                          disabled={actionLoading === inv.id}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                        >
                          {actionLoading === inv.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400 mr-1" />
                          ) : (
                            <XMarkIcon className="h-3 w-3 mr-1" />
                          )}
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => load(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => load(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * pageSize, invitations.length)}
                  </span>{' '}
                  条，共 <span className="font-medium">{invitations.length}</span> 条
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    onClick={() => load(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-none disabled:opacity-50"
                  >
                    <span className="sr-only">上一页</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => load(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === currentPage
                          ? 'z-10 bg-indigo-600 text-white focus:z-20 focus:outline-none'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-none'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => load(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-none disabled:opacity-50"
                  >
                    <span className="sr-only">下一页</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Inbox 