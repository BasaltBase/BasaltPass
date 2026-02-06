import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { notificationApi, TenantNotification } from '@api/tenant/tenantNotification'
import { useAuth } from './AuthContext'

interface NotificationContextType {
  notifications: TenantNotification[]
  unreadCount: number
  loading: boolean
  loadNotifications: () => Promise<void>
  markAsRead: (id: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (id: number) => Promise<void>
  refreshUnreadCount: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<TenantNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const loadNotifications = async () => {
    try {
      // 未登录直接跳过
      if (!isAuthenticated) return
      setLoading(true)
      const response = await notificationApi.getUserNotifications()
      setNotifications(response.data.data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshUnreadCount = async () => {
    try {
      // 未登录直接跳过
      if (!isAuthenticated) return
      const response = await notificationApi.getUnreadCount()
      setUnreadCount(response.data.count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
    }
  }

  const markAsRead = async (id: number) => {
    try {
      await notificationApi.markAsRead(id)
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, is_read: true }
            : notification
        )
      )
      await refreshUnreadCount()
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead()
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      )
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  const deleteNotification = async (id: number) => {
    try {
      await notificationApi.deleteNotification(id)
      setNotifications(prev => prev.filter(notification => notification.id !== id))
      await refreshUnreadCount()
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  // 当认证完成且已登录时再拉取通知
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadNotifications()
      refreshUnreadCount()
    }
  }, [authLoading, isAuthenticated])

  // 未登录时清空缓存数据，避免上一位用户数据泄露
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
    }
  }, [isAuthenticated])

  // 定期刷新未读数量（每30秒）
  useEffect(() => {
    // 仅登录状态下才轮询未读数
    if (!isAuthenticated) return
    const interval = setInterval(refreshUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshUnreadCount,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
} 