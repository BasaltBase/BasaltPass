import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import { notificationApi, TenantNotification, CreateNotificationRequest } from '@api/tenant/tenantNotification'
import { 
  BellIcon, 
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { Link } from 'react-router-dom'
import { ROUTES } from '@constants'
import { PSkeleton, PBadge, PPageHeader, PPagination, PButton } from '@ui'

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<TenantNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const pageSize = 20

  const [formData, setFormData] = useState<CreateNotificationRequest>({
    app_name: '系统信息',
    title: '',
    content: '',
    type: 'info',
    receiver_ids: []
  })

  useEffect(() => {
    loadNotifications()
  }, [page])

  const loadNotifications = async () => {
    try {
      setLoading(true)
      const response = await notificationApi.getAllNotifications(page, pageSize)
      setNotifications(response.data.data)
      setTotal(response.data.total)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // 创建通知
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      uiAlert('请填写完整的通知信息')
      return
    }
    try {
      setCreating(true)
      await notificationApi.createNotification(formData)
      setShowCreateModal(false)
      setFormData({ app_name: '系统信息', title: '', content: '', type: 'info', receiver_ids: [] })
      loadNotifications()
    } catch (error) {
      console.error('Failed to create notification:', error)
      uiAlert('创建通知失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!await uiConfirm('确定要删除这条通知吗？')) return

    try {
      await notificationApi.deleteNotificationAdmin(id)
      setNotifications(prev => prev.filter(notification => notification.id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
      uiAlert('删除通知失败')
    }
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
    const variantMap: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info',
    }
    const nameMap: Record<string, string> = {
      success: '成功', warning: '警告', error: '错误', info: '信息',
    }
    return (
      <PBadge variant={variantMap[type] || 'info'}>
        {nameMap[type] || type}
      </PBadge>
    )
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN')
  }

  return (
    <AdminLayout title="通知中心">
      <div className="space-y-6">

        <PPageHeader
          title="通知中心"
          description="统一管理站内通知"
          icon={<BellIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={() => setShowCreateModal(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
              发送通知
            </PButton>
          }
        />

        {/* 栏目切换 */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 pt-4">
            <div className="flex space-x-6 border-b border-gray-200">
              <button
                className="-mb-px px-1 pb-3 text-sm font-medium border-b-2 border-indigo-600 text-indigo-700"
                aria-current="page"
              >
                全局通知
              </button>
            </div>
          </div>
        </div>

        {/* 通知列表 */}
        <div className="bg-white shadow rounded-lg">
          {loading ? (
            <PSkeleton.List items={5} />
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h3>
              <p className="text-gray-500">还没有发送过任何通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <h3 className="text-lg font-medium text-gray-900">
                            {notification.title}
                          </h3>
                          {getTypeBadge(notification.type)}
                        </div>
                        <div className="flex items-center space-x-2">
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
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>用户ID: {notification.user_id}</span>
                          <span>已读: {notification.is_read ? '是' : '否'}</span>
                          <span>{formatTime(notification.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
        {/* 创建通知模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
            <div className="w-3/4 max-w-4xl p-6 border shadow-lg rounded-md bg-white">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">发送新通知</h2>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleCreateNotification} className="space-y-6">
                {/* 第一行：通知标题、应用模块、通知类型 */}
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      通知标题 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="输入通知标题"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      应用模块
                    </label>
                    <input
                      type="text"
                      value={formData.app_name}
                      onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="如 系统信息/安全中心"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      通知类型
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="info">信息</option>
                      <option value="success">成功</option>
                      <option value="warning">警告</option>
                      <option value="error">错误</option>
                    </select>
                  </div>
                </div>

                {/* 第二行：通知内容（全宽） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    通知内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="输入通知内容"
                    required
                  />
                </div>

                {/* 第三行：发送给特定用户（全宽） */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    发送给特定用户（可选）
                  </label>
                  <input
                    type="text"
                    value={formData.receiver_ids?.join(', ') || ''}
                    onChange={(e) => {
                      const ids = e.target.value.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                      setFormData({ ...formData, receiver_ids: ids })
                    }}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="输入用户ID，用逗号分隔（留空发送给所有用户）"
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    留空将发送给所有用户，或输入用户ID（用逗号分隔）
                  </p>
                </div>

                {/* 按钮区域 */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>取消</PButton>
                  <PButton type="submit" disabled={creating} loading={creating}>发送通知</PButton>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminNotifications 