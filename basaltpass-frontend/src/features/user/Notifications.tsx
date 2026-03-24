import React, { useState, useEffect } from 'react'
import Layout from '@features/user/components/Layout'
import { PCard, PButton, PSelect, PSkeleton, PBadge, PPageHeader, PPagination } from '@ui'
import { useNotifications } from '@contexts/NotificationContext'
import { notificationApi, TenantNotification } from '@api/tenant/tenantNotification'
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
      console.error('Failed to load notifications:', error)
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
      success: '成功',
      warning: '警告',
      error: '错误',
      info: '信息',
    }
    return (
      <PBadge variant={variants[type as keyof typeof variants] || 'default'}>
        {names[type as keyof typeof names] || type}
      </PBadge>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
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
          <PPageHeader title="通知中心" description="管理您的所有通知" />
          <div className="flex items-center space-x-3">
            {unreadCount > 0 && (
              <PButton
                onClick={handleMarkAllAsRead}
                variant="primary"
              >
                <CheckIcon className="h-4 w-4 mr-2" />
                全部已读
              </PButton>
            )}
          </div>
        </div>

        {/* 过滤器 */}
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
                全部 ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                未读 ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  filter === 'read'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                已读 ({notifications.length - unreadCount})
              </button>
            </div>
          </div>
        </PCard>

        {/* 通知列表 */}
        <PCard>
          {loading ? (
            <PSkeleton.List items={5} />
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h3>
              <p className="text-gray-500">
                {filter === 'all' ? '您还没有收到任何通知' : 
                 filter === 'unread' ? '没有未读通知' : '没有已读通知'}
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
                              title="标记为已读"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="删除通知"
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
                          <PBadge variant="info">未读</PBadge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PCard>

        {/* 分页 */}
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