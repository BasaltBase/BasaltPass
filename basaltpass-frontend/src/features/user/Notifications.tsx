import React, { useState, useEffect } from 'react'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PSkeleton, PBadge, PPageHeader, PPagination } from '@ui'
import { useNotifications } from '@contexts/NotificationContext'
import { notificationApi, TenantNotification } from '@api/tenant/tenantNotification'
import { useI18n } from '@shared/i18n'
import { 
  BellIcon, 
  CheckIcon, 
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

const Notifications: React.FC = () => {
  const { t, locale } = useI18n()
  const { markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [notifications, setNotifications] = useState<TenantNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const pageSize = 20

  useEffect(() => {
    loadNotifications()
  }, [page, filter])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationApi.getUserNotifications(page, pageSize)
      setNotifications(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      console.error(t('userNotifications.logs.loadFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id: number) => {
    await markAsRead(id)
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, is_read: true }
          : notification
      )
    )
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, is_read: true }))
    )
  }

  const handleDelete = async (id: number) => {
    await deleteNotification(id)
    setNotifications(prev => prev.filter(notification => notification.id !== id))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
    }
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      success: 'success' as const,
      warning: 'warning' as const,
      error: 'error' as const,
      info: 'info' as const,
    }
    const names = {
      success: t('userNotifications.types.success'),
      warning: t('userNotifications.types.warning'),
      error: t('userNotifications.types.error'),
      info: t('userNotifications.types.info'),
    }
    return (
      <PBadge variant={variants[type as keyof typeof variants] || 'default'}>
        {names[type as keyof typeof names] || type}
      </PBadge>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(locale)
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read
    if (filter === 'read') return notification.is_read
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PPageHeader title={t('userNotifications.title')} description={t('userNotifications.description')} />
          <div className="flex items-center space-x-3">
            {unreadCount > 0 && (
              <PButton
                onClick={handleMarkAllAsRead}
                variant="primary"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                {t('userNotifications.actions.markAllRead')}
              </PButton>
            )}
          </div>
        </div>

        {/*  */}
        <PCard>
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('userNotifications.filters.all', { count: notifications.length })}
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('userNotifications.filters.unread', { count: unreadCount })}
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'read'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('userNotifications.filters.read', { count: notifications.length - unreadCount })}
              </button>
            </div>
          </div>
        </PCard>

        {/*  */}
        <PCard>
          {loading ? (
            <PSkeleton.List items={5} />
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('userNotifications.empty.title')}</h3>
              <p className="text-gray-500">
                {filter === 'all' ? t('userNotifications.empty.all') : 
                 filter === 'unread' ? t('userNotifications.empty.unread') : t('userNotifications.empty.read')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className={`text-lg font-medium ${
                            !notification.is_read ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </h3>
                          {getTypeBadge(notification.type)}
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-gray-400 hover:text-green-600"
                              title={t('userNotifications.actions.markRead')}
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="text-gray-400 hover:text-red-600"
                            title={t('userNotifications.actions.delete')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-600">
                        {notification.content}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-sm text-gray-400">
                          {formatTime(notification.created_at)}
                        </p>
                        {!notification.is_read && (
                          <PBadge variant="info">{t('userNotifications.badges.unread')}</PBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PCard>

        {/*  */}
        {total > pageSize && (
          <PPagination
            currentPage={page}
            totalPages={Math.ceil(total / pageSize)}
            onPageChange={setPage}
            total={total}
            pageSize={pageSize}
            showInfo
          />
        )}
      </div>
    </Layout>
  )
}

export default Notifications 