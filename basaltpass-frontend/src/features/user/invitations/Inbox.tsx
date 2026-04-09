import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { Link } from 'react-router-dom'
import Layout from '@features/user/components/Layout'
import { PButton, PSkeleton, PBadge, PEmptyState, PPagination } from '@ui'
import { invitationApi, Invitation } from '@api/user/invitation'
import { CheckIcon, XMarkIcon, ClockIcon, UserGroupIcon, EnvelopeIcon, CalendarIcon, UserIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@contexts/AuthContext'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'

const Inbox: React.FC = () => {
  const { t, locale } = useI18n()
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
      
      // （）
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      const paginatedInvitations = allInvitations.slice(startIndex, endIndex)
      
      setInvitations(paginatedInvitations)
      setTotalPages(Math.ceil(allInvitations.length / pageSize))
      setCurrentPage(page)
    } catch (error: any) {
      console.error(t('userInvitationsInbox.logs.loadFailed'), error)
      // 401，，AuthContext
      if (error.response?.status !== 401) {
        // ，
        console.error(t('userInvitationsInbox.logs.loadFailedDetail'), error.response?.data?.message || error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 
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
      load(currentPage) // 
    } catch (error: any) {
      uiAlert(error.response?.data?.message || (action === 'accept' ? t('userInvitationsInbox.errors.acceptFailed') : t('userInvitationsInbox.errors.rejectFailed')))
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { text: t('userInvitationsInbox.status.pending'), variant: 'warning' as const },
      accepted: { text: t('userInvitationsInbox.status.accepted'), variant: 'success' as const },
      rejected: { text: t('userInvitationsInbox.status.rejected'), variant: 'error' as const },
      revoked: { text: t('userInvitationsInbox.status.revoked'), variant: 'default' as const },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <PBadge variant={config.variant}>{config.text}</PBadge>
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return t('userInvitationsInbox.time.today', { time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })
    } else if (diffDays === 1) {
      return t('userInvitationsInbox.time.yesterday', { time: date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) })
    } else if (diffDays < 7) {
      return t('userInvitationsInbox.time.daysAgo', { days: diffDays })
    } else {
      return date.toLocaleDateString(locale)
    }
  }

    return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/*  */}
        <div className="flex items-center">
          <Link
            to={ROUTES.user.teams}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {t('userInvitationsInbox.actions.backToTeams')}
          </Link>
        </div>

        {/*  */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
                <EnvelopeIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{t('userInvitationsInbox.title')}</h1>
                <p className="mt-2 text-lg text-gray-600">
                  {t('userInvitationsInbox.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
              <ClockIcon className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('userInvitationsInbox.totalCount', { count: invitations.length })}
              </span>
            </div>
          </div>
          
 
        </div>

        {/*  */}
        {loading ? (
          <PSkeleton.List items={3} />
        ) : invitations.length === 0 ? (
          <PEmptyState
            icon={<EnvelopeIcon className="w-12 h-12" />}
            title={t('userInvitationsInbox.empty.title')}
            description={t('userInvitationsInbox.empty.description')}
          />
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
                              {t('userInvitationsInbox.inviteFromTeam', { teamName: inv.team?.name || '' })}
                            </h3>
                            {getStatusBadge(inv.status)}
                          </div>
                          
                          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <UserIcon className="w-4 h-4" />
                              <span>{t('userInvitationsInbox.inviter', { name: inv.inviter?.nickname || inv.inviter?.email || '' })}</span>
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
                    
                    {/*  */}
                    {inv.status === 'pending' && (
                      <div className="flex items-center space-x-3 ml-6">
                        <PButton
                          onClick={() => handleAction(inv, 'accept')}
                          loading={actionLoading === inv.id}
                        >
                          {t('userInvitationsInbox.actions.accept')}
                        </PButton>
                        <PButton
                          variant="secondary"
                          onClick={() => handleAction(inv, 'reject')}
                          loading={actionLoading === inv.id}
                        >
                          {t('userInvitationsInbox.actions.reject')}
                        </PButton>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/*  */}
        {totalPages > 1 && (
          <PPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => load(page)}
            total={invitations.length}
            pageSize={pageSize}
            showInfo
          />
        )}
      </div>
    </Layout>
  )
}

export default Inbox 