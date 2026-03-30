import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
import TenantLayout from '@features/tenant/components/TenantLayout';
import { 
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import * as tenantSubscriptionAPI from '@api/tenant/subscription';
import { PSkeleton, PBadge, PButton, PPageHeader, Modal } from '@ui'

interface SubscriptionWithDetails {
  ID: number;
  TenantID?: number;
  UserID: number;
  Status: string;
  CurrentPriceID: number;
  NextPriceID?: number | null;
  StartAt: string;
  CurrentPeriodStart: string;
  CurrentPeriodEnd: string;
  CancelAt?: string | null;
  CanceledAt?: string | null;
  GatewaySubscriptionID?: string | null;
  Metadata: Record<string, any>;
  CreatedAt: string;
  UpdatedAt: string;
  User?: {
    ID: number;
    Email: string;
    Nickname: string;
    Phone?: string;
    EmailVerified?: boolean;
    PhoneVerified?: boolean;
  };
  CurrentPrice?: tenantSubscriptionAPI.TenantPrice & {
    Plan?: tenantSubscriptionAPI.TenantPlan & {
      Product?: tenantSubscriptionAPI.TenantProduct;
    };
  };
}

const SubscriptionStatusManagement: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await tenantSubscriptionAPI.tenantSubscriptionAPI.listTenantSubscriptions({
        page: 1,
        page_size: 100,
        status: statusFilter === 'all' ? undefined : statusFilter
      });
      
      // 使用新的API响应结构
      setSubscriptions(response.data || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'canceled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <PauseCircleIcon className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-blue-500" />;
      case 'overdue':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case 'trialing':
        return <ClockIcon className="h-5 w-5 text-indigo-500" />;
      default:
        return <CreditCardIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': '活跃',
      'canceled': '已取消',
      'paused': '已暂停',
      'pending': '待处理',
      'overdue': '逾期',
      'trialing': '试用中'
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'canceled': return 'error';
      case 'paused': return 'warning';
      case 'pending': return 'info';
      case 'overdue': return 'orange';
      case 'trialing': return 'info';
      default: return 'default';
    }
  };

  const handleStatusChange = async (subscriptionId: number, newStatus: string) => {
    const subscription = subscriptions.find(s => s.ID === subscriptionId);
    if (!subscription) return;

    const confirmMessage = `确定要将订阅状态改为"${getStatusText(newStatus)}"吗？`;
    if (!await uiConfirm(confirmMessage)) return;

    try {
      if (newStatus === 'canceled') {
        await tenantSubscriptionAPI.tenantSubscriptionAPI.cancelSubscription(subscriptionId, {});
      } else {
        // 这里应该有其他状态变更的API调用
        console.log('Changing status to:', newStatus);
      }
      
      uiAlert('订阅状态更新成功');
      fetchSubscriptions();
    } catch (error: any) {
      console.error('Failed to update subscription status:', error);
      uiAlert(`状态更新失败: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleViewDetails = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setShowDetailModal(true);
  };

  const formatCurrency = (cents: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const statusCounts = subscriptions.reduce((acc, sub) => {
    acc[sub.Status] = (acc[sub.Status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <TenantLayout title="订阅状态管理">
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="订阅状态管理">
      <div className="space-y-6">
        <PPageHeader
          title="订阅状态管理"
          description="管理所有订阅的生命周期和状态"
          icon={<CreditCardIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton onClick={fetchSubscriptions} leftIcon={<ArrowPathIcon className="h-4 w-4" />}>
              刷新
            </PButton>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {[
            { key: 'active', label: '活跃订阅', color: 'text-green-600' },
            { key: 'pending', label: '待处理', color: 'text-blue-600' },
            { key: 'canceled', label: '已取消', color: 'text-red-600' },
            { key: 'overdue', label: '逾期', color: 'text-orange-600' },
            { key: 'trialing', label: '试用中', color: 'text-indigo-600' },
            { key: 'paused', label: '已暂停', color: 'text-yellow-600' }
          ].map(({ key, label, color }) => (
            <div key={key} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {getStatusIcon(key)}
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className={`text-sm font-medium ${color} truncate`}>
                        {label}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statusCounts[key] || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 收入统计 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      月度总收入 (活跃订阅)
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(
                        subscriptions
                          .filter(s => s.Status === 'active' && s.CurrentPrice?.BillingPeriod === 'month')
                          .reduce((sum, s) => sum + (s.CurrentPrice?.AmountCents || 0), 0)
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      年度总收入 (活跃订阅)
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(
                        subscriptions
                          .filter(s => s.Status === 'active' && s.CurrentPrice?.BillingPeriod === 'year')
                          .reduce((sum, s) => sum + (s.CurrentPrice?.AmountCents || 0), 0)
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-8 w-8 text-indigo-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      客户总数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {new Set(subscriptions.map(s => s.UserID)).size}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 状态筛选 */}
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                statusFilter === 'all'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              全部 ({subscriptions.length})
            </button>
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  statusFilter === status
                    ? getStatusVariant(status) === 'success' ? 'bg-green-100 text-green-800' :
                      getStatusVariant(status) === 'error' ? 'bg-red-100 text-red-800' :
                      getStatusVariant(status) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      getStatusVariant(status) === 'info' ? 'bg-blue-100 text-blue-800' :
                      getStatusVariant(status) === 'orange' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {getStatusText(status)} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* 订阅列表 */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <ul className="divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <li key={subscription.ID}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {getStatusIcon(subscription.Status)}
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {subscription.CurrentPrice?.Plan?.Product?.Name || '未知产品'} - {subscription.CurrentPrice?.Plan?.DisplayName || '未知计划'}
                            </p>
                            <PBadge variant={getStatusVariant(subscription.Status) as any} className="ml-2">
                              {getStatusText(subscription.Status)}
                            </PBadge>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900">
                              {subscription.CurrentPrice ? formatCurrency(subscription.CurrentPrice.AmountCents, subscription.CurrentPrice.Currency) : 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              /{subscription.CurrentPrice?.BillingInterval || 1}{subscription.CurrentPrice?.BillingPeriod === 'month' ? '月' : subscription.CurrentPrice?.BillingPeriod === 'year' ? '年' : subscription.CurrentPrice?.BillingPeriod || ''}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">客户:</span> {subscription.User?.Nickname || 'N/A'} ({subscription.User?.Email || 'N/A'})
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">用户ID:</span> {subscription.User?.ID} | <span className="font-medium">订阅ID:</span> {subscription.ID}
                            </p>
                            {subscription.User?.Phone && (
                              <p className="text-sm text-gray-500">
                                <span className="font-medium">电话:</span> {subscription.User.Phone}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">开始时间:</span> {new Date(subscription.StartAt).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">当前周期:</span> {new Date(subscription.CurrentPeriodStart).toLocaleDateString()} - {new Date(subscription.CurrentPeriodEnd).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-500">
                              <span className="font-medium">计费类型:</span> {subscription.CurrentPrice?.UsageType === 'license' ? '许可证' : subscription.CurrentPrice?.UsageType || 'N/A'}
                            </p>
                          </div>
                        </div>
                        {subscription.Metadata && Object.keys(subscription.Metadata).length > 0 && (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(subscription.Metadata).map(([key, value]) => (
                                <PBadge key={key} variant="info">{key}: {String(value)}</PBadge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(subscription)}
                        className="inline-flex items-center rounded-full bg-gray-600 p-1 text-white shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        title="查看详情"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      {subscription.Status === 'active' && (
                        <button
                          onClick={() => handleStatusChange(subscription.ID, 'canceled')}
                          className="inline-flex items-center rounded-full bg-red-600 p-1 text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                          title="取消订阅"
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">暂无订阅</h3>
            <p className="mt-1 text-sm text-gray-500">
              当前没有任何订阅记录
            </p>
          </div>
        )}
      </div>

      {/* 订阅详情模态框 */}
      {showDetailModal && selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => setShowDetailModal(false)}
          onStatusChange={(newStatus) => {
            handleStatusChange(selectedSubscription.ID, newStatus);
            setShowDetailModal(false);
          }}
        />
      )}
    </TenantLayout>
  );
};

// 订阅详情模态框
const SubscriptionDetailModal: React.FC<{
  subscription: SubscriptionWithDetails;
  onClose: () => void;
  onStatusChange: (newStatus: string) => void;
}> = ({ subscription, onClose, onStatusChange }) => {
  const formatCurrency = (cents: number, currency: string = 'CNY') => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <Modal open onClose={onClose} title={`订阅详情 #${subscription.ID}`} widthClass="max-w-3xl">
      <div className="space-y-6">
          {/* 基本信息 */}
          <div className="rounded-xl bg-gray-50 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">基本信息</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">状态</label>
                <div className="mt-1 flex items-center">
                  {(() => {
                    const getStatusIcon = (status: string) => {
                      switch (status) {
                        case 'active': return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
                        case 'canceled': return <XCircleIcon className="h-5 w-5 text-red-500" />;
                        case 'paused': return <PauseCircleIcon className="h-5 w-5 text-yellow-500" />;
                        case 'pending': return <ClockIcon className="h-5 w-5 text-blue-500" />;
                        case 'overdue': return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
                        case 'trialing': return <ClockIcon className="h-5 w-5 text-indigo-500" />;
                        default: return <CreditCardIcon className="h-5 w-5 text-gray-500" />;
                      }
                    };
                    
                    const getStatusText = (status: string) => {
                      const statusMap: Record<string, string> = {
                        'active': '活跃',
                        'canceled': '已取消',
                        'paused': '已暂停',
                        'pending': '待处理',
                        'overdue': '逾期',
                        'trialing': '试用中'
                      };
                      return statusMap[status] || status;
                    };

                    return getStatusIcon(subscription.Status);
                  })()}
                  <span className="ml-2 text-sm text-gray-900">
                    {(() => {
                      const getStatusText = (status: string) => {
                        const statusMap: Record<string, string> = {
                          'active': '活跃',
                          'canceled': '已取消',  
                          'paused': '已暂停',
                          'pending': '待处理',
                          'overdue': '逾期',
                          'trialing': '试用中'
                        };
                        return statusMap[status] || status;
                      };

                      return getStatusText(subscription.Status);
                    })()}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">订阅ID</label>
                <p className="mt-1 text-sm text-gray-900">#{subscription.ID}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">开始时间</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(subscription.StartAt).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">当前周期</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(subscription.CurrentPeriodStart).toLocaleDateString()} - {new Date(subscription.CurrentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              
              {subscription.CancelAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">计划取消时间</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(subscription.CancelAt).toLocaleString()}
                  </p>
                </div>
              )}
              
              {subscription.CanceledAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">实际取消时间</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(subscription.CanceledAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 产品和价格信息 */}
          {subscription.CurrentPrice && (
            <div className="rounded-xl bg-blue-50 p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-3">产品和价格信息</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">产品名称</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.CurrentPrice.Plan?.Product?.Name || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">计划名称</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.CurrentPrice.Plan?.DisplayName || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">价格</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatCurrency(subscription.CurrentPrice.AmountCents, subscription.CurrentPrice.Currency)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">计费周期</label>
                  <p className="mt-1 text-sm text-gray-900">
                    每{subscription.CurrentPrice.BillingInterval || 1}{subscription.CurrentPrice.BillingPeriod === 'month' ? '月' : subscription.CurrentPrice.BillingPeriod === 'year' ? '年' : subscription.CurrentPrice.BillingPeriod || ''}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">使用类型</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.CurrentPrice.UsageType === 'license' ? '许可证' : subscription.CurrentPrice.UsageType || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">货币</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.CurrentPrice.Currency}
                  </p>
                </div>
                
                {subscription.CurrentPrice.TrialDays && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">试用天数</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {subscription.CurrentPrice.TrialDays}天
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 客户信息 */}
          {subscription.User && (
            <div className="rounded-xl bg-green-50 p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-3">客户信息</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">用户ID</label>
                  <p className="mt-1 text-sm text-gray-900">#{subscription.User.ID}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">昵称</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.User.Nickname || 'N/A'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">邮箱</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {subscription.User.Email}
                    {subscription.User.EmailVerified && (
                      <PBadge variant="success" className="ml-2">已验证</PBadge>
                    )}
                  </p>
                </div>
                
                {subscription.User.Phone && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">电话</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {subscription.User.Phone}
                      {subscription.User.PhoneVerified && (
                        <PBadge variant="success" className="ml-2">已验证</PBadge>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 系统信息 */}
          <div className="rounded-xl bg-gray-50 p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-3">系统信息</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">创建时间</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(subscription.CreatedAt).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">更新时间</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(subscription.UpdatedAt).toLocaleString()}
                </p>
              </div>
              
              {subscription.GatewaySubscriptionID && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">网关订阅ID</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {subscription.GatewaySubscriptionID}
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">租户ID</label>
                <p className="mt-1 text-sm text-gray-900">
                  #{subscription.TenantID}
                </p>
              </div>
            </div>
          </div>

          {/* 元数据 */}
          {subscription.Metadata && Object.keys(subscription.Metadata).length > 0 && (
            <div className="rounded-xl bg-yellow-50 p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-3">元数据</h4>
              <div className="space-y-2">
                {Object.entries(subscription.Metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg border bg-white p-2">
                    <span className="text-sm font-medium text-gray-700">{key}:</span>
                    <span className="text-sm text-gray-900 font-mono">{JSON.stringify(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end space-x-2 border-t pt-6">
          {subscription.Status === 'active' && (
            <PButton
              onClick={() => onStatusChange('canceled')}
              variant="danger"
            >
              取消订阅
            </PButton>
          )}
          <PButton onClick={onClose} variant="secondary">
            关闭
          </PButton>
        </div>
    </Modal>
  );
};

export default SubscriptionStatusManagement;
