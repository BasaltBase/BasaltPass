import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { uiAlert, uiConfirm, uiPrompt } from '@contexts/DialogContext'
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
import { PSkeleton, PBadge, PButton, PEmptyState, PInput, PSelect, PTextarea, Modal, PPageHeader } from '@ui'

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
      uiAlert('获取优惠券列表失败，请检查网络连接或联系管理员');
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
    if (!await uiConfirm(`确定要删除优惠券"${couponCode}"吗？`)) {
      return;
    }

    try {
      await deleteTenantCoupon(couponCode);
      setCoupons(prev => prev.filter(c => c.Code !== couponCode));
      uiAlert('优惠券删除成功');
    } catch (error: any) {
      console.error('Failed to delete coupon:', error);
      uiAlert(`删除优惠券失败: ${error.response?.data?.error || error.message || '服务器错误'}`);
    }
  };

  const handleToggleStatus = async (couponCode: string, currentStatus: boolean) => {
    try {
      await updateTenantCoupon(couponCode, { is_active: !currentStatus });
      setCoupons(prev => prev.map(c => 
        c.Code === couponCode ? { ...c, IsActive: !currentStatus } : c
      ));
      uiAlert(`优惠券已${!currentStatus ? '启用' : '停用'}`);
    } catch (error: any) {
      console.error('Failed to toggle coupon status:', error);
      uiAlert(`操作失败: ${error.response?.data?.error || error.message || '服务器错误'}`);
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
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title="优惠券管理">
      <div className="space-y-6">
        <PPageHeader
          title="优惠券管理"
          description="创建和管理订阅优惠券，提升用户转化率"
          icon={<GiftIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton type="button" onClick={handleCreateCoupon} leftIcon={<PlusIcon className="h-5 w-5" />}>
              创建优惠券
            </PButton>
          }
        />

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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

          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
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
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <PInput
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                placeholder="搜索优惠券代码或名称..."
              />
            </div>
            <div>
              <PSelect
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">所有状态</option>
                <option value="active">活跃</option>
                <option value="inactive">已停用</option>
                <option value="expired">已过期</option>
              </PSelect>
            </div>
          </div>
        </div>

        {/* 优惠券列表 */}
        {filteredCoupons.length === 0 ? (
          <PEmptyState
            icon={GiftIcon}
            title={searchTerm || filterStatus !== 'all' ? '没有找到匹配的优惠券' : '暂无优惠券'}
            description={searchTerm || filterStatus !== 'all' ? '请尝试调整搜索条件或筛选器' : '开始创建第一个优惠券来提升销售'}
          >
            {!searchTerm && filterStatus === 'all' && (
              <PButton onClick={handleCreateCoupon} leftIcon={<PlusIcon className="h-5 w-5" />}>创建优惠券</PButton>
            )}
          </PEmptyState>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCoupons.map((coupon, index) => {
              const status = getCouponStatus(coupon);
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={coupon.ID || coupon.Code || `coupon-${index}`}
                  className={`overflow-hidden rounded-xl bg-white shadow-sm border-l-4 ${
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
                        <PBadge variant={
                          status.color === 'green' ? 'success' :
                          status.color === 'red' ? 'error' :
                          status.color === 'orange' ? 'orange' :
                          'default'
                        }>
                          {status.text}
                        </PBadge>
                        <div className="flex space-x-1">
                          <PButton
                            size="sm"
                            variant={coupon.IsActive ? 'danger' : 'secondary'}
                            onClick={() => handleToggleStatus(coupon.Code, coupon.IsActive)}
                          >
                            {coupon.IsActive ? '停用' : '启用'}
                          </PButton>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <PButton variant="secondary" className="flex-1" onClick={() => handleEditCoupon(coupon)} leftIcon={<PencilIcon className="h-4 w-4" />}>编辑</PButton>
                      <PButton variant="danger" className="flex-1" onClick={() => handleDeleteCoupon(coupon.Code)} leftIcon={<TrashIcon className="h-4 w-4" />}>删除</PButton>
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
        uiAlert('优惠券更新成功');
      } else {
        // 创建优惠券
        await createTenantCoupon(submitData);
        uiAlert('优惠券创建成功');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save coupon:', error);
      uiAlert(`保存优惠券失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={coupon ? '编辑优惠券' : '创建优惠券'}
      widthClass="max-w-2xl"
    >
      <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <PInput
                label="优惠券代码 *"
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="输入优惠券代码"
              />
              <PInput
                label="优惠券名称 *"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入优惠券名称"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">折扣类型 *</label>
                <PSelect
                  required
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                >
                  <option value="percent">百分比折扣</option>
                  <option value="fixed">固定金额折扣</option>
                </PSelect>
              </div>
              
              <div>
                <PInput
                  label="折扣值 *"
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                  required
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percent' ? '输入百分比 (如: 10)' : '输入金额 (如: 50)'}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.discount_type === 'percent' ? '输入1-100之间的数字' : '输入金额（元）'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">使用期限 *</label>
                <PSelect
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value as 'once' | 'repeating' | 'forever' })}
                >
                  <option value="once">一次性</option>
                  <option value="repeating">重复使用</option>
                  <option value="forever">永久</option>
                </PSelect>
              </div>
              
              {formData.duration === 'repeating' && (
                <PInput
                  label="重复周期数"
                  type="number"
                  min="1"
                  value={formData.duration_in_cycles}
                  onChange={(e) => setFormData({ ...formData, duration_in_cycles: e.target.value })}
                  placeholder="输入周期数"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PInput
                label="最大使用次数"
                type="number"
                min="1"
                value={formData.max_redemptions}
                onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                placeholder="留空表示无限制"
              />
              <PInput
                label="过期日期"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            <PTextarea
              label="描述"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="输入优惠券描述"
            />

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
              <PButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                取消
              </PButton>
              <PButton
                type="submit"
                disabled={submitting}
              >
                {submitting ? '保存中...' : (coupon ? '更新' : '创建')}
              </PButton>
            </div>
          </form>
      </div>
    </Modal>
  );
};

export default CouponManagement;
