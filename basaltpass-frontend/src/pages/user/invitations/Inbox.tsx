import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '../../components/Layout'
import { invitationApi, Invitation } from '../../api/invitation'
import { CheckIcon, XMarkIcon, ClockIcon, UserGroupIcon, EnvelopeIcon, CalendarIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'

const Inbox: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
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
    } catch (error: any) {
      console.error('加载邀请失败:', error)
      // 如果是401错误，不要在这里处理，让AuthContext处理
      if (error.response?.status !== 401) {
        // 对于其他错误，可以显示用户友好的错误信息
        console.error('邀请加载失败:', error.response?.data?.message || error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 只有在认证完成且已认证时才加载数据
    if (!isLoading && isAuthenticated) {
      load()
    }
  }, [isLoading, isAuthenticated])

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
      pending: { 
        text: '待处理', 
        class: 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border border-yellow-200',
        icon: ClockIcon
      },
      accepted: { 
        text: '已接受', 
        class: 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200',
        icon: CheckIcon
      },
      rejected: { 
        text: '已拒绝', 
        class: 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200',
        icon: XMarkIcon
      },
      revoked: { 
        text: '已撤回', 
        class: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200',
        icon: XMarkIcon
      },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.class} shadow-sm`}>
        <IconComponent className="w-3 h-3 mr-1" />
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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 返回按钮 */}
        <div className="flex items-center">
          <Link
            to="/teams"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回团队列表
          </Link>
        </div>

        {/* 头部区域 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <EnvelopeIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">邀请收件箱</h1>
                <p className="mt-2 text-lg text-gray-600">
                  查看和管理您收到的团队邀请
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
              <ClockIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                共 {invitations.length} 条邀请
              </span>
            </div>
          </div>
          
 
        </div>

        {/* 邀请列表 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <EnvelopeIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-gray-600 font-medium">正在加载邀请...</p>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-12 border border-gray-200">
              <div className="bg-gradient-to-r from-gray-100 to-slate-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <EnvelopeIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无邀请</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                您目前没有收到任何团队邀请。当有新邀请时，它们会出现在这里。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
                            <UserGroupIcon className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              来自团队 "{inv.team?.name}" 的邀请
                            </h3>
                            {getStatusBadge(inv.status)}
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <UserIcon className="w-4 h-4" />
                              <span>邀请人：{inv.inviter?.nickname || inv.inviter?.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>{formatDate(inv.created_at)}</span>
                            </div>
                          </div>
                          
                          {inv.remark && (
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-3 border-l-4 border-blue-500">
                              <p className="text-sm text-gray-700 italic">
                                "{inv.remark}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 操作按钮 */}
                    {inv.status === 'pending' && (
                      <div className="flex items-center space-x-3 ml-6">
                        <button
                          onClick={() => handleAction(inv, 'accept')}
                          disabled={actionLoading === inv.id}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200 shadow-sm"
                        >
                          {actionLoading === inv.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2" />
                          ) : (
                            <CheckIcon className="h-4 w-4 mr-2" />
                          )}
                          接受邀请
                        </button>
                        <button
                          onClick={() => handleAction(inv, 'reject')}
                          disabled={actionLoading === inv.id}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-all duration-200 shadow-sm"
                        >
                          {actionLoading === inv.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-400 mr-2" />
                          ) : (
                            <XMarkIcon className="h-4 w-4 mr-2" />
                          )}
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="text-sm text-gray-700">
                显示第 <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                <span className="font-semibold text-gray-900">
                  {Math.min(currentPage * pageSize, invitations.length)}
                </span>{' '}
                条，共 <span className="font-semibold text-gray-900">{invitations.length}</span> 条
              </div>
              <nav className="flex items-center space-x-2">
                <button
                  onClick={() => load(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  上一页
                </button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => load(page)}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                        page === currentPage
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => load(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  下一页
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default Inbox 