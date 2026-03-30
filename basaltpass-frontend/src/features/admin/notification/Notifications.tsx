import React, { useEffect, useState } from 'react'
import {
  BellIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { adminNotificationApi, AdminCreateNotificationRequest, AdminNotification } from '@api/admin/notification'
import { BaseEntityItem, EntitySearchSelect, PBadge, PButton, PInput, PPageHeader, PPagination, PSelect, PSkeleton, PTextarea, Modal } from '@ui'
import { uiAlert, uiConfirm } from '@contexts/DialogContext'

const pageSize = 20

const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<BaseEntityItem[]>([])
  const [formData, setFormData] = useState<AdminCreateNotificationRequest>({
    app_name: '系统信息',
    title: '',
    content: '',
    type: 'info',
    receiver_ids: [],
  })

  useEffect(() => {
    void loadNotifications(page)
  }, [page])

  const loadNotifications = async (nextPage: number) => {
    try {
      setLoading(true)
      const response = await adminNotificationApi.getNotifications(nextPage, pageSize)
      setNotifications(response.data.data || [])
      setTotal(response.data.total || 0)
    } catch (error) {
      console.error('Failed to load admin notifications:', error)
      uiAlert('获取通知列表失败')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      app_name: '系统信息',
      title: '',
      content: '',
      type: 'info',
      receiver_ids: [],
    })
    setSelectedUsers([])
  }

  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      uiAlert('请填写完整的通知标题和内容')
      return
    }

    try {
      setCreating(true)
      await adminNotificationApi.createNotification({
        ...formData,
        receiver_ids: selectedUsers.map(item => Number(item.id)),
      })
      setShowCreateModal(false)
      resetForm()
      await loadNotifications(page)
    } catch (error: any) {
      console.error('Failed to create admin notification:', error)
      uiAlert(error?.response?.data?.error || '发送通知失败')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!await uiConfirm('确定要删除这条通知吗？')) return

    try {
      await adminNotificationApi.deleteNotification(id)
      await loadNotifications(page)
    } catch (error) {
      console.error('Failed to delete admin notification:', error)
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
      success: '成功',
      warning: '警告',
      error: '错误',
      info: '信息',
    }
    return <PBadge variant={variantMap[type] || 'info'}>{nameMap[type] || type}</PBadge>
  }

  return (
    <AdminLayout title="通知中心">
      <div className="space-y-6">
        <PPageHeader
          title="通知中心"
          description="向全站任意用户发送站内通知"
          icon={<BellIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={() => setShowCreateModal(true)} leftIcon={<PlusIcon className="h-4 w-4" />}>
              发送通知
            </PButton>
          }
        />

        <div className="rounded-xl bg-white shadow-sm">
          {loading ? (
            <PSkeleton.List items={5} />
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无通知</h3>
              <p className="text-gray-500">还没有发送过任何全局通知</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-6 transition-colors hover:bg-gray-50">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-medium text-gray-900">{notification.title}</h3>
                          {getTypeBadge(notification.type)}
                        </div>
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="删除通知"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <p className="mt-2 text-gray-600">{notification.content}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>应用: {notification.app?.name || '-'}</span>
                        <span>发送者: {notification.sender_name || '系统'}</span>
                        <span>接收者: {notification.receiver_id === 0 ? '全站广播' : `用户 #${notification.receiver_id}`}</span>
                        <span>已读: {notification.is_read ? '是' : '否'}</span>
                        <span>{new Date(notification.created_at).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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

        {showCreateModal && (
          <Modal
            open={showCreateModal}
            onClose={() => {
              setShowCreateModal(false)
              resetForm()
            }}
            title="发送全局通知"
            widthClass="max-w-4xl"
          >
            <div className="space-y-6">
              <form onSubmit={handleCreateNotification} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <PInput
                    label={<>通知标题 <span className="text-red-500">*</span></>}
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="输入通知标题"
                    required
                  />
                  <PInput
                    label="应用模块"
                    type="text"
                    value={formData.app_name}
                    onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                    placeholder="如 系统信息/安全中心"
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">通知类型</label>
                    <PSelect
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as AdminCreateNotificationRequest['type'] })}
                    >
                      <option value="info">信息</option>
                      <option value="success">成功</option>
                      <option value="warning">警告</option>
                      <option value="error">错误</option>
                    </PSelect>
                  </div>
                </div>

                <PTextarea
                  label={<>通知内容 <span className="text-red-500">*</span></>}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  placeholder="输入通知内容"
                  required
                />

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <UserIcon className="h-4 w-4 mr-2 text-indigo-500" />
                    指定接收用户
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <EntitySearchSelect
                      entity="user"
                      context="admin"
                      value={selectedUsers}
                      onChange={setSelectedUsers}
                      placeholder="搜索用户名或邮箱..."
                      variant="chips"
                      limit={10}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    不选择用户时将按全站广播发送；选择用户后仅发送给这些指定用户。
                  </p>
                </div>

                <div className="flex justify-end space-x-3 border-t border-gray-200 pt-6">
                  <PButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                  >
                    取消
                  </PButton>
                  <PButton type="submit" disabled={creating} loading={creating}>
                    发送通知
                  </PButton>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminNotifications
