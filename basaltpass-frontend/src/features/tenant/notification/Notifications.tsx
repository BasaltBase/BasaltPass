import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  PlusIcon, 
  TrashIcon, 
  UserIcon, 
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { EntitySearchSelect, PSkeleton, PBadge, PButton, PInput, PPageHeader, PPagination, PSelect, PTextarea, Modal } from '@ui';
import {
  TenantNotification,
  TenantCreateNotificationRequest,
  TenantUser,
  tenantNotificationApi
} from '@api/tenant/notification';
import TenantLayout from '@features/tenant/components/TenantLayout';
import { useI18n } from '@shared/i18n';

const TenantNotifications: React.FC = () => {
  const { t, locale } = useI18n();
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const [selectedUsers, setSelectedUsers] = useState<TenantUser[]>([]); // 

  // 
  const [formData, setFormData] = useState<TenantCreateNotificationRequest>({
    app_name: '',
    title: '',
    content: '',
    type: 'info',
    receiver_ids: [],
  });

  // 
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
    visible: boolean;
  }>({
    type: 'info',
    text: '',
    visible: false,
  });

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text, visible: true });
    setTimeout(() => {
      setMessage(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // 
  const fetchNotifications = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const response = await tenantNotificationApi.getNotifications(page, pageSize);
      setNotifications(response.data.data || []);
      setPagination({
        current: page,
        pageSize,
        total: response.data.total || 0,
      });
    } catch (error: any) {
      setNotifications([]); //  null
      showMessage('error', error.response?.data?.error || t('tenantNotifications.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // 
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tenantNotificationApi.createNotification(formData);
      showMessage('success', t('tenantNotifications.messages.sendSuccess'));
      setModalVisible(false);
      setFormData({
        app_name: '',
        title: '',
        content: '',
        type: 'info',
        receiver_ids: [],
      });
      setSelectedUsers([]); // 
      fetchNotifications();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || t('tenantNotifications.messages.sendFailed'));
    }
  };

  // 
  const handleDelete = async (id: number) => {
    try {
      await tenantNotificationApi.deleteNotification(id);
      showMessage('success', t('tenantNotifications.messages.deleteSuccess'));
      setDeleteConfirm(null);
      fetchNotifications();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || t('tenantNotifications.messages.deleteFailed'));
    }
  };

  // 
  const handlePageChange = (page: number) => {
    fetchNotifications(page, pagination.pageSize);
  };

  const getTypeVariant = (type: string) => {
    const variants: Record<string, string> = {
      info: 'info',
      success: 'success',
      warning: 'warning',
      error: 'error',
    };
    return variants[type] || 'default';
  };

  // 
  const getTypeText = (type: string) => {
    const texts = {
      info: t('tenantNotifications.types.info'),
      success: t('tenantNotifications.types.success'),
      warning: t('tenantNotifications.types.warning'),
      error: t('tenantNotifications.types.error'),
    };
    return texts[type as keyof typeof texts] || type;
  };

  // 
  const handleInputChange = (field: keyof TenantCreateNotificationRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <TenantLayout title={t('tenantNotifications.layoutTitle')}>
    <div className="p-6">
      {/*  */}
      {message.visible && (
        <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 rounded-xl px-4 py-3 shadow-lg ${
          message.type === 'success' ? 'bg-green-500 text-white' :
          message.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {message.type === 'success' && <CheckIcon className="w-5 h-5" />}
          {message.type === 'error' && <ExclamationTriangleIcon className="w-5 h-5" />}
          <span>{message.text}</span>
          <button 
            onClick={() => setMessage(prev => ({ ...prev, visible: false }))}
            className="ml-2 hover:opacity-75"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/*  */}
      <PPageHeader
        title={t('tenantNotifications.title')}
        icon={<BellIcon className="w-8 h-8 text-blue-600" />}
        actions={
          <PButton onClick={() => setModalVisible(true)} leftIcon={<PlusIcon className="w-5 h-5" />}>{t('tenantNotifications.actions.send')}</PButton>
        }
      />

      {/*  */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{t('tenantNotifications.listTitle')}</h2>
        </div>
        
        {loading ? (
          <PSkeleton.List items={5} />
        ) : !notifications || notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BellIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{t('tenantNotifications.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.app')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.title')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.content')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.sender')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.receiver')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.createdAt')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('tenantNotifications.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {notifications && notifications.map((notification) => (
                  <tr key={notification.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notification.app?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notification.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {notification.content}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PBadge variant={getTypeVariant(notification.type) as any}>{getTypeText(notification.type)}</PBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notification.sender_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {notification.user ? (
                        <div className="flex items-center">
                          <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{notification.user.nickname || notification.user.email}</span>
                        </div>
                      ) : (
                        <PBadge variant="purple">{t('tenantNotifications.broadcastAll')}</PBadge>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleString(locale)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {deleteConfirm === notification.id ? (
                        <div className="flex items-center space-x-2">
                          <PButton size="sm" variant="danger" onClick={() => handleDelete(notification.id)}>{t('tenantNotifications.actions.confirmDelete')}</PButton>
                          <PButton size="sm" variant="secondary" onClick={() => setDeleteConfirm(null)}>{t('tenantNotifications.actions.cancel')}</PButton>
                        </div>
                      ) : (
                        <PButton size="sm" variant="ghost" onClick={() => setDeleteConfirm(notification.id)}>
                          <TrashIcon className="w-4 h-4 text-red-600" />
                        </PButton>
                      )}
                    </td>
                  </tr>
                )) || []}
              </tbody>
            </table>
          </div>
        )}

        {/*  */}
        {notifications && notifications.length > 0 && pagination.total > pagination.pageSize && (
          <div className="px-6 py-4 border-t border-gray-200">
            <PPagination
              currentPage={pagination.current}
              totalPages={Math.ceil(pagination.total / pagination.pageSize)}
              onPageChange={handlePageChange}
              total={pagination.total}
              pageSize={pagination.pageSize}
              showInfo
            />
          </div>
        )}
      </div>

      {/*  */}
      {modalVisible && (
        <Modal
          open={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setFormData({ app_name: '', title: '', content: '', type: 'info', receiver_ids: [] });
            setSelectedUsers([]);
          }}
          title={t('tenantNotifications.modal.title')}
          widthClass="max-w-3xl"
        >
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <PInput
                label={<>{t('tenantNotifications.modal.appName')} <span className="text-red-500">*</span></>}
                type="text"
                value={formData.app_name}
                onChange={(e) => handleInputChange('app_name', e.target.value)}
                placeholder={t('tenantNotifications.modal.appNamePlaceholder')}
                required
              />
              <div>
                <label htmlFor="tenant-notification-type" className="mb-2 block text-sm font-medium text-gray-700">
                  {t('tenantNotifications.modal.type')} <span className="text-red-500">*</span>
                </label>
                <PSelect
                  id="tenant-notification-type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as 'info' | 'success' | 'warning' | 'error')}
                  required
                >
                  <option value="info">{t('tenantNotifications.types.info')}</option>
                  <option value="success">{t('tenantNotifications.types.success')}</option>
                  <option value="warning">{t('tenantNotifications.types.warning')}</option>
                  <option value="error">{t('tenantNotifications.types.error')}</option>
                </PSelect>
              </div>
            </div>

            <PInput
              label={<>{t('tenantNotifications.modal.notificationTitle')} <span className="text-red-500">*</span></>}
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder={t('tenantNotifications.modal.notificationTitlePlaceholder')}
              required
            />

            <PTextarea
              label={<>{t('tenantNotifications.modal.notificationContent')} <span className="text-red-500">*</span></>}
              rows={4}
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder={t('tenantNotifications.modal.notificationContentPlaceholder')}
              required
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                {t('tenantNotifications.modal.receivers')}
                <span className="ml-2 text-xs text-gray-500">({t('tenantNotifications.modal.receiversHint')})</span>
              </label>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <EntitySearchSelect
                  entity="user"
                  context="tenant"
                  value={selectedUsers.map(user => ({
                    id: user.id,
                    label: user.nickname || user.email,
                    subtitle: user.phone || user.email,
                    type: 'user',
                    raw: user
                  }))}
                  onChange={(items: any[]) => {
                    const newSelectedUsers = items.map((item: any) => item.raw as TenantUser);
                    setSelectedUsers(newSelectedUsers);
                    setFormData(prev => ({
                      ...prev,
                      receiver_ids: newSelectedUsers.map((u: any) => u.id)
                    }));
                  }}
                  placeholder={t('tenantNotifications.modal.searchUsersPlaceholder')}
                  variant="chips"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 pt-6">
              <PButton
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalVisible(false);
                  setFormData({ app_name: '', title: '', content: '', type: 'info', receiver_ids: [] });
                  setSelectedUsers([]);
                }}
              >
                {t('tenantNotifications.actions.cancel')}
              </PButton>
              <PButton type="submit">{t('tenantNotifications.actions.send')}</PButton>
            </div>
          </form>
        </Modal>
      )}
    </div>
    </TenantLayout>
  );
};

export default TenantNotifications;
