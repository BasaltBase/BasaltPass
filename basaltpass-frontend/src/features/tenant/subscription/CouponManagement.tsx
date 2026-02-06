import React, { useState, useEffect } from 'react';
import TenantLayout from '@features/tenant/components/TenantLayout';
import { 
  GiftIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  PercentBadgeIcon,
  TagIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import * as tenantSubscriptionAPI from '@api/tenant/subscription';
import { 
  listTenantCoupons, 
  createTenantCoupon, 
  updateTenantCoupon, 
  deleteTenantCoupon 
} from '@api/tenant/subscription';
import useDebounce from '@hooks/useDebounce';

interface CouponManagementProps {}

const CouponManagement: React.FC<CouponManagementProps> = () => {
  const [coupons, setCoupons] = useState<tenantSubscriptionAPI.TenantCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 200);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<tenantSubscriptionAPI.TenantCoupon | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await listTenantCoupons({
        page: 1,
        page_size: 100
      });
      
      setCoupons(response.data || []);
    } catch (error) {
      console.error('Failed to fetch coupons:', error);
      alert('获取优惠券列表失败，请检查网络连接或联系管理员');
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = (coupon.Code || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                         (coupon.Name || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && coupon.IsActive && !isExpired(coupon)) ||
                         (filterStatus === 'inactive' && !coupon.IsActive) ||
                         (filterStatus === 'expired' && isExpired(coupon));
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    setShowCreateModal(true);
  };

  const handleEditCoupon = (coupon: tenantSubscriptionAPI.TenantCoupon) => {
    setEditingCoupon(coupon);
    setShowCreateModal(true);
  };

  const handleDeleteCoupon = async (couponCode: string) => {
    if (!confirm(`确定要删除优惠券"${couponCode}"吗？`)) {
      return;
    }

    try {
      await deleteTenantCoupon(couponCode);
      setCoupons(prev => prev.filter(c => c.Code !== couponCode));
      alert('优惠券删除成功');
    } catch (error: any) {
      console.error('Failed to delete coupon:', error);
      alert(`删除优惠券失败: ${error.response?.data?.error || error.message || '服务器错误'}`);
    }
  };

  const handleToggleStatus = async (couponCode: string, currentStatus: boolean) => {
    try {
      await updateTenantCoupon(couponCode, { is_active: !currentStatus });
      setCoupons(prev => prev.map(c => 
        c.Code === couponCode ? { ...c, IsActive: !currentStatus } : c
      ));
      alert(`优惠券已${!currentStatus ? '启用' : '停用'}`);
    } catch (error: any) {
      console.error('Failed to toggle coupon status:', error);
      alert(`操作失败: ${error.response?.data?.error || error.message || '服务器错误'}`);
    }
  };

  const formatDiscountValue = (coupon: tenantSubscriptionAPI.TenantCoupon) => {
    if (coupon.DiscountType === 'percent') {
      return `${(coupon.DiscountValue / 100).toFixed(1)}%`;
    } else {
      return `¥${(coupon.DiscountValue / 100).toFixed(2)}`;
    }
  };

  const formatDuration = (coupon: tenantSubscriptionAPI.TenantCoupon) => {
    switch (coupon.Duration) {
      case 'once':
        return '一次性';
      case 'repeating':
        return coupon.DurationInCycles ? `${coupon.DurationInCycles}个周期` : '重复使用';
      case 'forever':
        return '永久';
      default:
        return coupon.Duration;
    }
  };

  const isExpired = (coupon: tenantSubscriptionAPI.TenantCoupon) => {
    return coupon.ExpiresAt && new Date(coupon.ExpiresAt) < new Date();
  };

  const isMaxRedemptionsReached = (coupon: tenantSubscriptionAPI.TenantCoupon) => {
    return coupon.MaxRedemptions && coupon.RedeemedCount >= coupon.MaxRedemptions;
  };

  const getCouponStatus = (coupon: tenantSubscriptionAPI.TenantCoupon) => {
    if (!coupon.IsActive) return { text: '已停用', color: 'gray', icon: XCircleIcon };
    if (isExpired(coupon)) return { text: '已过期', color: 'red', icon: ClockIcon };
    if (isMaxRedemptionsReached(coupon)) return { text: '已用完', color: 'orange', icon: ExclamationTriangleIcon };
    return { text: '活跃', color: 'green', icon: CheckCircleIcon };
  };

  if (loading) {
    return (
      <TenantLayout title="优惠券管理">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="优惠券管理">
      <div className="space-y-6">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">优惠券管理</h1>
            <p className="mt-2 text-sm text-gray-700">
              创建和管理订阅优惠券，提升用户转化率
            </p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleCreateCoupon}
              className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              创建优惠券
            </button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GiftIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总优惠券</dt>
                    <dd className="text-lg font-medium text-gray-900">{coupons.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">活跃券</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {coupons.filter(c => c.IsActive && !isExpired(c)).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">已过期</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {coupons.filter(c => isExpired(c)).length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TagIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">总使用次数</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {coupons.reduce((sum, c) => sum + (c.RedeemedCount || 0), 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选和搜索栏 */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="搜索优惠券代码或名称..."
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">已停用</option>
                <option value="expired">已过期</option>
              </select>
            </div>
          </div>
        </div>

        {/* 优惠券列表 */}
        {filteredCoupons.length === 0 ? (
          <div className="text-center py-12 bg-white shadow rounded-lg">
            <GiftIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || filterStatus !== 'all' ? '没有找到匹配的优惠券' : '暂无优惠券'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || filterStatus !== 'all' 
                ? '请尝试调整搜索条件或筛选器' 
                : '开始创建第一个优惠券来提升销售'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleCreateCoupon}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  创建优惠券
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCoupons.map((coupon, index) => {
              const status = getCouponStatus(coupon);
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={coupon.ID || coupon.Code || `coupon-${index}`}
                  className={`bg-white overflow-hidden shadow rounded-lg border-l-4 ${
                    status.color === 'green' ? 'border-green-400' :
                    status.color === 'red' ? 'border-red-400' :
                    status.color === 'orange' ? 'border-orange-400' :
                    'border-gray-400'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {coupon.DiscountType === 'percent' ? (
                            <PercentBadgeIcon className="h-6 w-6 text-blue-600" />
                          ) : (
                            <GiftIcon className="h-6 w-6 text-green-600" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {coupon.Name}
                          </p>
                          <p className="text-lg font-bold text-gray-700">
                            {coupon.Code}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <StatusIcon className={`h-5 w-5 ${
                          status.color === 'green' ? 'text-green-500' :
                          status.color === 'red' ? 'text-red-500' :
                          status.color === 'orange' ? 'text-orange-500' :
                          'text-gray-500'
                        }`} />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">折扣：</span>
                        <span className="font-medium text-lg text-blue-600">
                          {formatDiscountValue(coupon)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">类型：</span>
                        <span className="font-medium">{formatDuration(coupon)}</span>
                      </div>

                      {coupon.MaxRedemptions && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">使用情况：</span>
                          <div className="text-right">
                            <span className="font-medium">
                              {coupon.RedeemedCount}/{coupon.MaxRedemptions}
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ 
                                  width: `${Math.min((coupon.RedeemedCount / coupon.MaxRedemptions) * 100, 100)}%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {coupon.ExpiresAt && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">过期时间：</span>
                          <span className={`font-medium ${isExpired(coupon) ? 'text-red-600' : 'text-gray-900'}`}>
                            {new Date(coupon.ExpiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          status.color === 'green' ? 'bg-green-100 text-green-800' :
                          status.color === 'red' ? 'bg-red-100 text-red-800' :
                          status.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {status.text}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleToggleStatus(coupon.Code, coupon.IsActive)}
                            className={`inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded ${
                              coupon.IsActive 
                                ? 'text-red-700 bg-red-100 hover:bg-red-200' 
                                : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                          >
                            {coupon.IsActive ? '停用' : '启用'}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <button
                        onClick={() => handleEditCoupon(coupon)}
                        className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PencilIcon className="h-4 w-4 mr-1" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(coupon.Code)}
                        className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 创建/编辑优惠券模态框 */}
      {showCreateModal && (
        <CreateCouponModal
          coupon={editingCoupon}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCoupons();
          }}
        />
      )}
    </TenantLayout>
  );
};

// 创建优惠券模态框组件
const CreateCouponModal: React.FC<{
  coupon?: tenantSubscriptionAPI.TenantCoupon | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ coupon, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    code: coupon?.Code || '',
    name: coupon?.Name || '',
    discount_type: coupon?.DiscountType || 'percent' as 'percent' | 'fixed',
    discount_value: coupon?.DiscountValue ? (coupon.DiscountValue / (coupon.DiscountType === 'percent' ? 100 : 100)).toString() : '',
    duration: coupon?.Duration || 'once' as 'once' | 'repeating' | 'forever',
    duration_in_cycles: coupon?.DurationInCycles?.toString() || '',
    max_redemptions: coupon?.MaxRedemptions?.toString() || '',
    expires_at: coupon?.ExpiresAt ? new Date(coupon.ExpiresAt).toISOString().split('T')[0] : '',
    is_active: coupon?.IsActive ?? true,
    description: coupon?.Metadata?.description || ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      
      const submitData: tenantSubscriptionAPI.CreateTenantCouponRequest = {
        code: formData.code,
        name: formData.name,
        discount_type: formData.discount_type as 'percent' | 'fixed',
        discount_value: formData.discount_type === 'percent' 
          ? Math.round(parseFloat(formData.discount_value) * 100) // 转换为基点
          : Math.round(parseFloat(formData.discount_value) * 100), // 转换为分
        duration: formData.duration as 'once' | 'repeating' | 'forever',
        duration_in_cycles: formData.duration_in_cycles ? parseInt(formData.duration_in_cycles) : undefined,
        max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : undefined,
        // 后端期望 ISO 8601（RFC3339）时间字符串，表单为日期，需转换
        // 约定使用该日 23:59:59Z 作为过期时间，避免时区造成的日期偏移
        expires_at: formData.expires_at
          ? new Date(`${formData.expires_at}T23:59:59Z`).toISOString()
          : undefined,
        metadata: {
          description: formData.description
        }
      };

      if (coupon) {
        // 更新优惠券
        await updateTenantCoupon(coupon.Code, submitData as tenantSubscriptionAPI.UpdateTenantCouponRequest);
        alert('优惠券更新成功');
      } else {
        // 创建优惠券
        await createTenantCoupon(submitData);
        alert('优惠券创建成功');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save coupon:', error);
      alert(`保存优惠券失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            {coupon ? '编辑优惠券' : '创建优惠券'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优惠券代码 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入优惠券代码"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优惠券名称 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="输入优惠券名称"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  折扣类型 *
                </label>
                <select
                  required
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="percent">百分比折扣</option>
                  <option value="fixed">固定金额折扣</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  折扣值 *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                  required
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={formData.discount_type === 'percent' ? '输入百分比 (如: 10)' : '输入金额 (如: 50)'}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.discount_type === 'percent' ? '输入1-100之间的数字' : '输入金额（元）'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  使用期限 *
                </label>
                <select
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value as 'once' | 'repeating' | 'forever' })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="once">一次性</option>
                  <option value="repeating">重复使用</option>
                  <option value="forever">永久</option>
                </select>
              </div>
              
              {formData.duration === 'repeating' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    重复周期数
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.duration_in_cycles}
                    onChange={(e) => setFormData({ ...formData, duration_in_cycles: e.target.value })}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入周期数"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大使用次数
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_redemptions}
                  onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="留空表示无限制"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  过期日期
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                描述
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="输入优惠券描述"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                立即激活优惠券
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-base font-medium rounded-md shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {submitting ? '保存中...' : (coupon ? '更新' : '创建')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CouponManagement;
