import React, { useState, useEffect } from 'react';
import { 
  BellIcon, 
  PlusIcon, 
  TrashIcon, 
  UserIcon, 
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
  TenantNotification,
  TenantCreateNotificationRequest,
  TenantUser,
  tenantNotificationApi
} from '@api/tenant/notification';
import { tenantNotificationApi as notificationApi } from '@api/notification';
import client from '@api/client';
import TenantLayout from '@components/TenantLayout';

const TenantNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<TenantNotification[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // 用户搜索相关状态
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<TenantUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<TenantUser[]>([]); // 保存选中的用户完整信息

  // 表单数据
  const [formData, setFormData] = useState<TenantCreateNotificationRequest>({
    app_name: '',
    title: '',
    content: '',
    type: 'info',
    receiver_ids: [],
  });

  // 消息提示
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

  // 获取通知列表
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
      setNotifications([]); // 确保在错误时设置为空数组而不是 null
      showMessage('error', error.response?.data?.error || '获取通知列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取租户用户列表
  const fetchUsers = async (search = '') => {
    try {
      const response = await tenantNotificationApi.getTenantUsers(search);
      setUsers(response.data.data || []);
    } catch (error: any) {
      setUsers([]); // 确保在错误时设置为空数组
      // 只在有搜索条件时显示错误，避免初始化时显示无意义的错误
      if (search) {
        showMessage('error', error.response?.data?.error || '获取用户列表失败');
      }
    }
  };

  // 搜索用户
  const searchUsers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await notificationApi.searchTenantUsers(searchTerm);
      setSearchResults(response.data.data || []);
      setShowSearchResults(true);
    } catch (error: any) {
      setSearchResults([]);
      // 只在搜索关键词不为空时显示错误信息
      if (searchTerm.trim()) {
        showMessage('error', error.response?.data?.error || '搜索用户失败');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // 处理搜索输入变化
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // 选择搜索结果中的用户
  const selectUserFromSearch = (user: TenantUser) => {
    // 检查用户是否已被选择
    if (!(formData.receiver_ids || []).includes(user.id)) {
      handleUserSelect(user.id);
      // 添加到已选用户列表中
      setSelectedUsers(prev => [...prev, user]);
    }
    // 清空搜索
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // 处理多选用户
  const handleUserSelect = (userId: number) => {
    const isSelected = (formData.receiver_ids || []).includes(userId);
    
    setFormData(prev => ({
      ...prev,
      receiver_ids: isSelected
        ? (prev.receiver_ids || []).filter(id => id !== userId)
        : [...(prev.receiver_ids || []), userId],
    }));

    // 如果是取消选择，从已选用户列表中移除
    if (isSelected) {
      setSelectedUsers(prev => prev.filter(user => user.id !== userId));
    } else {
      // 如果是新选择，查找用户信息并添加到已选用户列表
      const userInfo = users.find(user => user.id === userId) || 
                      searchResults.find(user => user.id === userId);
      if (userInfo && !selectedUsers.find(user => user.id === userId)) {
        setSelectedUsers(prev => [...prev, userInfo]);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
    // 添加调试信息
    debugUserTenant();
  }, []);

  // 搜索防抖效果
  useEffect(() => {
    if (searchTerm.trim()) {
      const timeoutId = setTimeout(() => {
        searchUsers(searchTerm);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchTerm]);

  // 调试用户租户状态
  const debugUserTenant = async () => {
    try {
      const response = await client.get('/api/v1/debug/user-tenant');
      console.log('用户租户调试信息:', response.data);
    } catch (error) {
      console.error('获取调试信息失败:', error);
    }
  };

  // 创建通知
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tenantNotificationApi.createNotification(formData);
      showMessage('success', '通知发送成功');
      setModalVisible(false);
      setFormData({
        app_name: '',
        title: '',
        content: '',
        type: 'info',
        receiver_ids: [],
      });
      setSelectedUsers([]); // 清空已选用户
      fetchNotifications();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || '发送通知失败');
    }
  };

  // 删除通知
  const handleDelete = async (id: number) => {
    try {
      await tenantNotificationApi.deleteNotification(id);
      showMessage('success', '删除成功');
      setDeleteConfirm(null);
      fetchNotifications();
    } catch (error: any) {
      showMessage('error', error.response?.data?.error || '删除失败');
    }
  };

  // 分页变化
  const handlePageChange = (page: number) => {
    fetchNotifications(page, pagination.pageSize);
  };

  // 通知类型样式映射
  const getTypeStyle = (type: string) => {
    const styles = {
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
    };
    return styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // 通知类型中文映射
  const getTypeText = (type: string) => {
    const texts = {
      info: '信息',
      success: '成功',
      warning: '警告',
      error: '错误',
    };
    return texts[type as keyof typeof texts] || type;
  };

  // 处理表单字段变化
  const handleInputChange = (field: keyof TenantCreateNotificationRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <TenantLayout title="租户通知管理">
    <div className="p-6">
      {/* 消息提示 */}
      {message.visible && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center space-x-2 ${
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

      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <BellIcon className="w-8 h-8 text-blue-600 mr-3" />
          <h1 className="text-2xl font-bold text-gray-900">通知管理</h1>
        </div>
        <button
          onClick={() => setModalVisible(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          <span>发送通知</span>
        </button>
      </div>

      {/* 通知列表 */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">通知列表</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">加载中...</p>
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <BellIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>暂无通知记录</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">应用</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">内容</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">发送者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">接收者</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeStyle(notification.type)}`}>
                        {getTypeText(notification.type)}
                      </span>
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
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                          全员广播
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(notification.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {deleteConfirm === notification.id ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            确认删除
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(notification.id)}
                          className="text-red-600 hover:text-red-800 p-1 transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )) || []}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页 */}
        {notifications && notifications.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                显示第 {((pagination.current - 1) * pagination.pageSize) + 1} - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 条，共 {pagination.total} 条
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                
                <span className="px-3 py-1 text-sm">
                  第 {pagination.current} 页，共 {Math.ceil(pagination.total / pagination.pageSize)} 页
                </span>
                
                <button
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
                  className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 创建通知模态框 */}
      {modalVisible && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setModalVisible(false)}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreate}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center mb-4">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">发送通知</h3>
                  </div>

                  <div className="space-y-4">
                    {/* 应用名称 */}
                    <div>
                      <label htmlFor="app_name" className="block text-sm font-medium text-gray-700 mb-1">
                        应用名称 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="app_name"
                        value={formData.app_name}
                        onChange={(e) => handleInputChange('app_name', e.target.value)}
                        placeholder="如：安全中心、用户中心等"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* 通知标题 */}
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                        通知标题 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="请输入通知标题"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* 通知内容 */}
                    <div>
                      <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                        通知内容 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        id="content"
                        rows={4}
                        value={formData.content}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        placeholder="请输入通知内容"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* 通知类型 */}
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                        通知类型 <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="type"
                        value={formData.type}
                        onChange={(e) => handleInputChange('type', e.target.value as 'info' | 'success' | 'warning' | 'error')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="info">信息</option>
                        <option value="success">成功</option>
                        <option value="warning">警告</option>
                        <option value="error">错误</option>
                      </select>
                    </div>

                    {/* 接收用户 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        接收用户
                        <span className="text-gray-500 text-xs ml-2">(不选择用户则向租户下所有用户广播)</span>
                      </label>
                      
                      {/* 用户搜索框 */}
                      <div className="mb-3 relative">
                        <input
                          type="text"
                          placeholder="搜索用户（邮箱、昵称等）..."
                          value={searchTerm}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                        
                        {/* 搜索结果下拉框 */}
                        {showSearchResults && searchResults.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                            {searchResults.map(user => (
                              <div
                                key={user.id}
                                onClick={() => selectUserFromSearch(user)}
                                className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">
                                  {user.nickname || user.email} ({user.phone || user.email})
                                </span>
                                {(formData.receiver_ids || []).includes(user.id) && (
                                  <CheckIcon className="w-4 h-4 text-green-500 ml-auto" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* 无搜索结果提示 */}
                        {showSearchResults && searchResults.length === 0 && searchTerm && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-3 text-center text-gray-500 text-sm">
                            未找到匹配的用户
                          </div>
                        )}
                      </div>

                      {/* 已选择的用户列表 */}
                      {(formData.receiver_ids?.length || 0) > 0 && (
                        <div className="mb-3">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            已选择的用户 ({formData.receiver_ids?.length || 0})
                          </div>
                          <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-md bg-gray-50">
                            {selectedUsers.map(user => (
                              <div key={user.id} className="flex items-center justify-between p-2 text-sm">
                                <div className="flex items-center">
                                  <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                                  <span>{user.nickname || user.email}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUserSelect(user.id)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 所有用户列表（可选） */}
                      <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                        {!users || users.length === 0 ? (
                          <div className="p-3 text-gray-500 text-center">暂无用户</div>
                        ) : (
                          users.map(user => (
                            <label key={user.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={(formData.receiver_ids || []).includes(user.id)}
                                onChange={() => handleUserSelect(user.id)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <div className="ml-3 flex items-center">
                                <UserIcon className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">
                                  {user.nickname || user.email} ({user.phone || user.email})
                                </span>
                              </div>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    发送通知
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModalVisible(false);
                      setFormData({
                        app_name: '',
                        title: '',
                        content: '',
                        type: 'info',
                        receiver_ids: [],
                      });
                      setSelectedUsers([]); // 清空已选用户
                      setSearchTerm(''); // 清空搜索
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
    </TenantLayout>
  );
};

export default TenantNotifications;
