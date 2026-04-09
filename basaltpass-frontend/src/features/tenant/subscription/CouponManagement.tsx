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
import { useI18n } from '@shared/i18n'
import { PSkeleton, PBadge, PButton, PEmptyState, PInput, PSelect, PTextarea, Modal, PPageHeader } from '@ui'

interface CouponManagementProps {}

const CouponManagement: React.FC<CouponManagementProps> = () => {
  const { t, locale } = useI18n()
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
      uiAlert(t('tenantCouponManagement.alerts.fetchFailed'));
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
    if (!await uiConfirm(t('tenantCouponManagement.confirm.deleteCoupon', { code: couponCode }))) {
      return;
    }

    try {
      await deleteTenantCoupon(couponCode);
      setCoupons(prev => prev.filter(c => c.Code !== couponCode));
      uiAlert(t('tenantCouponManagement.alerts.deleteSuccess'));
    } catch (error: any) {
      console.error('Failed to delete coupon:', error);
      uiAlert(`${t('tenantCouponManagement.alerts.deleteFailed')}: ${error.response?.data?.error || error.message || t('tenantCouponManagement.errors.serverError')}`);
    }
  };

  const handleToggleStatus = async (couponCode: string, currentStatus: boolean) => {
    try {
      await updateTenantCoupon(couponCode, { is_active: !currentStatus });
      setCoupons(prev => prev.map(c => 
        c.Code === couponCode ? { ...c, IsActive: !currentStatus } : c
      ));
      uiAlert(t(!currentStatus ? 'tenantCouponManagement.alerts.enabled' : 'tenantCouponManagement.alerts.disabled'));
    } catch (error: any) {
      console.error('Failed to toggle coupon status:', error);
      uiAlert(`${t('tenantCouponManagement.alerts.operationFailed')}: ${error.response?.data?.error || error.message || t('tenantCouponManagement.errors.serverError')}`);
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
        return t('tenantCouponManagement.duration.once');
      case 'repeating':
        return coupon.DurationInCycles ? t('tenantCouponManagement.duration.repeatingWithCycles', { cycles: coupon.DurationInCycles }) : t('tenantCouponManagement.duration.repeating');
      case 'forever':
        return t('tenantCouponManagement.duration.forever');
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
    if (!coupon.IsActive) return { text: t('tenantCouponManagement.status.inactive'), color: 'gray', icon: XCircleIcon };
    if (isExpired(coupon)) return { text: t('tenantCouponManagement.status.expired'), color: 'red', icon: ClockIcon };
    if (isMaxRedemptionsReached(coupon)) return { text: t('tenantCouponManagement.status.exhausted'), color: 'orange', icon: ExclamationTriangleIcon };
    return { text: t('tenantCouponManagement.status.active'), color: 'green', icon: CheckCircleIcon };
  };

  if (loading) {
    return (
      <TenantLayout title={t('tenantCouponManagement.layoutTitle')}>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    );
  }

  return (
    <TenantLayout title={t('tenantCouponManagement.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('tenantCouponManagement.title')}
          description={t('tenantCouponManagement.description')}
          icon={<GiftIcon className="h-8 w-8 text-indigo-600" />}
          actions={
            <PButton type="button" onClick={handleCreateCoupon} leftIcon={<PlusIcon className="h-5 w-5" />}>
              {t('tenantCouponManagement.actions.createCoupon')}
            </PButton>
          }
        />

        {/*  */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GiftIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantCouponManagement.stats.totalCoupons')}</dt>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantCouponManagement.stats.activeCoupons')}</dt>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantCouponManagement.stats.expiredCoupons')}</dt>
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
                    <dt className="text-sm font-medium text-gray-500 truncate">{t('tenantCouponManagement.stats.totalRedemptions')}</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {coupons.reduce((sum, c) => sum + (c.RedeemedCount || 0), 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/*  */}
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
                placeholder={t('tenantCouponManagement.filters.searchPlaceholder')}
              />
            </div>
            <div>
              <PSelect
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">{t('tenantCouponManagement.filters.allStatus')}</option>
                <option value="active">{t('tenantCouponManagement.filters.active')}</option>
                <option value="inactive">{t('tenantCouponManagement.filters.inactive')}</option>
                <option value="expired">{t('tenantCouponManagement.filters.expired')}</option>
              </PSelect>
            </div>
          </div>
        </div>

        {/*  */}
        {filteredCoupons.length === 0 ? (
          <PEmptyState
            icon={GiftIcon}
            title={searchTerm || filterStatus !== 'all' ? t('tenantCouponManagement.empty.noMatchTitle') : t('tenantCouponManagement.empty.noCouponsTitle')}
            description={searchTerm || filterStatus !== 'all' ? t('tenantCouponManagement.empty.noMatchDescription') : t('tenantCouponManagement.empty.noCouponsDescription')}
          >
            {!searchTerm && filterStatus === 'all' && (
              <PButton onClick={handleCreateCoupon} leftIcon={<PlusIcon className="h-5 w-5" />}>{t('tenantCouponManagement.actions.createCoupon')}</PButton>
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
                        <span className="text-gray-500">{t('tenantCouponManagement.fields.discount')}</span>
                        <span className="font-medium text-lg text-blue-600">
                          {formatDiscountValue(coupon)}
                        </span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t('tenantCouponManagement.fields.type')}</span>
                        <span className="font-medium">{formatDuration(coupon)}</span>
                      </div>

                      {coupon.MaxRedemptions && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">{t('tenantCouponManagement.fields.usage')}</span>
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
                          <span className="text-gray-500">{t('tenantCouponManagement.fields.expiresAt')}</span>
                          <span className={`font-medium ${isExpired(coupon) ? 'text-red-600' : 'text-gray-900'}`}>
                            {new Date(coupon.ExpiresAt).toLocaleDateString(locale)}
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
                            {coupon.IsActive ? t('tenantCouponManagement.actions.disable') : t('tenantCouponManagement.actions.enable')}
                          </PButton>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex space-x-2">
                      <PButton variant="secondary" className="flex-1" onClick={() => handleEditCoupon(coupon)} leftIcon={<PencilIcon className="h-4 w-4" />}>{t('tenantCouponManagement.actions.edit')}</PButton>
                      <PButton variant="danger" className="flex-1" onClick={() => handleDeleteCoupon(coupon.Code)} leftIcon={<TrashIcon className="h-4 w-4" />}>{t('tenantCouponManagement.actions.delete')}</PButton>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* / */}
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

// 
const CreateCouponModal: React.FC<{
  coupon?: tenantSubscriptionAPI.TenantCoupon | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ coupon, onClose, onSuccess }) => {
  const { t } = useI18n()
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
          ? Math.round(parseFloat(formData.discount_value) * 100) // 
          : Math.round(parseFloat(formData.discount_value) * 100), // 
        duration: formData.duration as 'once' | 'repeating' | 'forever',
        duration_in_cycles: formData.duration_in_cycles ? parseInt(formData.duration_in_cycles) : undefined,
        max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : undefined,
        //  ISO 8601（RFC3339），，
        //  23:59:59Z ，
        expires_at: formData.expires_at
          ? new Date(`${formData.expires_at}T23:59:59Z`).toISOString()
          : undefined,
        metadata: {
          description: formData.description
        }
      };

      if (coupon) {
        // 
        await updateTenantCoupon(coupon.Code, submitData as tenantSubscriptionAPI.UpdateTenantCouponRequest);
        uiAlert(t('tenantCouponManagement.alerts.updatedSuccess'));
      } else {
        // 
        await createTenantCoupon(submitData);
        uiAlert(t('tenantCouponManagement.alerts.createdSuccess'));
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save coupon:', error);
      uiAlert(`${t('tenantCouponManagement.alerts.saveFailed')}: ${error.response?.data?.error || error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={coupon ? t('tenantCouponManagement.modal.editTitle') : t('tenantCouponManagement.modal.createTitle')}
      widthClass="max-w-2xl"
    >
      <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <PInput
                label={t('tenantCouponManagement.modal.codeLabel')}
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder={t('tenantCouponManagement.modal.codePlaceholder')}
              />
              <PInput
                label={t('tenantCouponManagement.modal.nameLabel')}
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('tenantCouponManagement.modal.namePlaceholder')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('tenantCouponManagement.modal.discountTypeLabel')}</label>
                <PSelect
                  required
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percent' | 'fixed' })}
                >
                  <option value="percent">{t('tenantCouponManagement.modal.discountTypePercent')}</option>
                  <option value="fixed">{t('tenantCouponManagement.modal.discountTypeFixed')}</option>
                </PSelect>
              </div>
              
              <div>
                <PInput
                  label={t('tenantCouponManagement.modal.discountValueLabel')}
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                  required
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={formData.discount_type === 'percent' ? t('tenantCouponManagement.modal.discountValuePercentPlaceholder') : t('tenantCouponManagement.modal.discountValueFixedPlaceholder')}
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.discount_type === 'percent' ? t('tenantCouponManagement.modal.discountValuePercentHint') : t('tenantCouponManagement.modal.discountValueFixedHint')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('tenantCouponManagement.modal.durationLabel')}</label>
                <PSelect
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value as 'once' | 'repeating' | 'forever' })}
                >
                  <option value="once">{t('tenantCouponManagement.duration.once')}</option>
                  <option value="repeating">{t('tenantCouponManagement.duration.repeating')}</option>
                  <option value="forever">{t('tenantCouponManagement.duration.forever')}</option>
                </PSelect>
              </div>
              
              {formData.duration === 'repeating' && (
                <PInput
                  label={t('tenantCouponManagement.modal.durationCyclesLabel')}
                  type="number"
                  min="1"
                  value={formData.duration_in_cycles}
                  onChange={(e) => setFormData({ ...formData, duration_in_cycles: e.target.value })}
                  placeholder={t('tenantCouponManagement.modal.durationCyclesPlaceholder')}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PInput
                label={t('tenantCouponManagement.modal.maxRedemptionsLabel')}
                type="number"
                min="1"
                value={formData.max_redemptions}
                onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                placeholder={t('tenantCouponManagement.modal.maxRedemptionsPlaceholder')}
              />
              <PInput
                label={t('tenantCouponManagement.modal.expiresAtLabel')}
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>

            <PTextarea
              label={t('tenantCouponManagement.modal.descriptionLabel')}
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('tenantCouponManagement.modal.descriptionPlaceholder')}
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                {t('tenantCouponManagement.modal.activateImmediately')}
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <PButton
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                {t('tenantCouponManagement.actions.cancel')}
              </PButton>
              <PButton
                type="submit"
                disabled={submitting}
              >
                {submitting ? t('tenantCouponManagement.actions.saving') : (coupon ? t('tenantCouponManagement.actions.update') : t('tenantCouponManagement.actions.create'))}
              </PButton>
            </div>
          </form>
      </div>
    </Modal>
  );
};

export default CouponManagement;
