import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'

import {
  tenantSubscriptionAPI,
  TenantCoupon,
  CreateTenantCouponRequest,
  UpdateTenantCouponRequest,
} from '@api/tenant/subscription'
import { ROUTES } from '@constants'
import { useI18n } from '@shared/i18n'
import { PSkeleton, PBadge, PButton, PInput, PSelect, PCheckbox, Modal, PPageHeader } from '@ui'

export default function TenantCoupons() {
  const { t, locale } = useI18n()
  const [searchParams] = useSearchParams()
  const [coupons, setCoupons] = useState<TenantCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<TenantCoupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TenantCoupon | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState<CreateTenantCouponRequest>({
    code: '',
    name: '',
    discount_type: 'percent',
    discount_value: 0,
    duration: 'once',
    is_active: true,
    metadata: {},
  })

  useEffect(() => {
    fetchData()
    
    // 
    if (searchParams.get('action') === 'create') {
      setShowModal(true)
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await tenantSubscriptionAPI.adminListCoupons()
      setCoupons(data.data || [])
    } catch (error) {
      console.error(t('tenantSubscriptionCoupons.logs.fetchFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      //  discount_value 
      const submitData = {
        ...formData,
        discount_value: formData.discount_type === 'fixed' 
          ? Math.round(formData.discount_value * 100) // ：
          : Math.round(formData.discount_value) // ：
      }
      
      if (editingCoupon) {
        await tenantSubscriptionAPI.updateCoupon(editingCoupon.Code, submitData as UpdateTenantCouponRequest)
      } else {
        await tenantSubscriptionAPI.createCoupon(submitData)
      }
      setShowModal(false)
      setEditingCoupon(null)
      resetForm()
      fetchData()
    } catch (error) {
      console.error(t('tenantSubscriptionCoupons.logs.submitFailed'), error)
    }
  }

  const handleEdit = (coupon: TenantCoupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.Code,
      name: coupon.Name,
      discount_type: coupon.DiscountType,
      discount_value: coupon.DiscountType === 'fixed' 
        ? Math.round(coupon.DiscountValue / 100 * 100) / 100 // ，2
        : coupon.DiscountValue, // 
      duration: coupon.Duration,
      duration_in_cycles: coupon.DurationInCycles,
      max_redemptions: coupon.MaxRedemptions,
      expires_at: coupon.ExpiresAt ? new Date(coupon.ExpiresAt).toISOString().slice(0, 16) : undefined,
      is_active: coupon.IsActive,
      metadata: coupon.Metadata || {},
    })
    setShowModal(true)
  }

  const handleDeleteClick = (coupon: TenantCoupon) => {
    setDeleteTarget(coupon)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await tenantSubscriptionAPI.deleteCoupon(deleteTarget.Code)
      await fetchData()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('tenantSubscriptionCoupons.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      discount_type: 'percent',
      discount_value: 0,
      duration: 'once',
      is_active: true,
      metadata: {},
    })
  }

  const handleCancel = () => {
    setShowModal(false)
    setEditingCoupon(null)
    resetForm()
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percent') {
      return `${value}%`
    } else {
      return `¥${(value / 100).toFixed(2)}`
    }
  }

  const formatDuration = (duration: string, cycles?: number) => {
    switch (duration) {
      case 'once':
        return t('tenantSubscriptionCoupons.duration.once')
      case 'repeating':
        return cycles ? t('tenantSubscriptionCoupons.duration.repeatingWithCycles', { cycles }) : t('tenantSubscriptionCoupons.duration.repeating')
      case 'forever':
        return t('tenantSubscriptionCoupons.duration.forever')
      default:
        return duration
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <TenantLayout>
        <div className="py-6">
          <PSkeleton.Management />
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/*  */}
          <PPageHeader
            title={t('tenantSubscriptionCoupons.header.title')}
            description={t('tenantSubscriptionCoupons.header.description')}
            actions={
              <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>
                {t('tenantSubscriptionCoupons.actions.createCoupon')}
              </PButton>
            }
          />

          {/*  */}
          <div className="mt-8">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <ul className="divide-y divide-gray-200">
                {coupons.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    {t('tenantSubscriptionCoupons.empty.noData')}
                  </li>
                ) : (
                  coupons.map((coupon) => (
                    <li key={coupon.ID} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <p className="text-lg font-medium text-gray-900">
                                  {coupon.Name}
                                </p>
                                <PBadge variant="default">{coupon.Code}</PBadge>
                                {coupon.IsActive ? (
                                  <CheckCircleIcon className="h-5 w-5 text-green-500" title={t('tenantSubscriptionCoupons.status.active')} />
                                ) : (
                                  <XCircleIcon className="h-5 w-5 text-red-500" title={t('tenantSubscriptionCoupons.status.inactive')} />
                                )}
                                {isExpired(coupon.ExpiresAt) && (
                                  <PBadge variant="error">{t('tenantSubscriptionCoupons.status.expired')}</PBadge>
                                )}
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                <span>{t('tenantSubscriptionCoupons.fields.discount')}: {formatDiscount(coupon.DiscountType, coupon.DiscountValue)}</span>
                                <span>{t('tenantSubscriptionCoupons.fields.duration')}: {formatDuration(coupon.Duration, coupon.DurationInCycles)}</span>
                                <span>{t('tenantSubscriptionCoupons.fields.redeemed')}: {coupon.RedeemedCount} {t('tenantSubscriptionCoupons.fields.times')}</span>
                                {coupon.MaxRedemptions && (
                                  <span>{t('tenantSubscriptionCoupons.fields.maxRedemptions')}: {coupon.MaxRedemptions} {t('tenantSubscriptionCoupons.fields.times')}</span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-4">
                                  <span>{t('tenantSubscriptionCoupons.fields.createdAt')}: {new Date(coupon.CreatedAt).toLocaleString(locale)}</span>
                                  {coupon.ExpiresAt && (
                                    <span>{t('tenantSubscriptionCoupons.fields.expiresAt')}: {new Date(coupon.ExpiresAt).toLocaleString(locale)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                            title={t('tenantSubscriptionCoupons.actions.edit')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(coupon)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title={t('tenantSubscriptionCoupons.actions.delete')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* / */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={handleCancel}
          title={editingCoupon ? t('tenantSubscriptionCoupons.modal.editTitle') : t('tenantSubscriptionCoupons.modal.createTitle')}
          widthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PInput
                  label={t('tenantSubscriptionCoupons.modal.codeLabel')}
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  required
                  disabled={!!editingCoupon}
                  placeholder={t('tenantSubscriptionCoupons.modal.codePlaceholder')}
                />
              </div>
              <div>
                <PInput
                  label={t('tenantSubscriptionCoupons.modal.nameLabel')}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <PSelect
                  label={t('tenantSubscriptionCoupons.modal.discountTypeLabel')}
                  value={formData.discount_type}
                  onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percent' | 'fixed'})}
                  required
                >
                  <option value="percent">{t('tenantSubscriptionCoupons.modal.discountTypePercent')}</option>
                  <option value="fixed">{t('tenantSubscriptionCoupons.modal.discountTypeFixed')}</option>
                </PSelect>
              </div>
              <div>
                <PInput
                  label={t('tenantSubscriptionCoupons.modal.discountValueLabel')}
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                  min="0"
                  step={formData.discount_type === 'percent' ? '1' : '0.01'}
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.discount_type === 'percent' ? t('tenantSubscriptionCoupons.modal.discountHintPercent') : t('tenantSubscriptionCoupons.modal.discountHintFixed')}
                </p>
              </div>
              <div>
                <PSelect
                  label={t('tenantSubscriptionCoupons.modal.durationLabel')}
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value as 'once' | 'repeating' | 'forever'})}
                  required
                >
                  <option value="once">{t('tenantSubscriptionCoupons.duration.once')}</option>
                  <option value="repeating">{t('tenantSubscriptionCoupons.duration.repeating')}</option>
                  <option value="forever">{t('tenantSubscriptionCoupons.duration.forever')}</option>
                </PSelect>
              </div>
              {formData.duration === 'repeating' && (
                <div>
                  <PInput
                    label={t('tenantSubscriptionCoupons.modal.repeatCyclesLabel')}
                    type="number"
                    value={formData.duration_in_cycles || ''}
                    onChange={(e) => setFormData({...formData, duration_in_cycles: e.target.value ? parseInt(e.target.value) : undefined})}
                    min="1"
                  />
                </div>
              )}
              <div>
                <PInput
                  label={t('tenantSubscriptionCoupons.modal.maxRedemptionsLabel')}
                  type="number"
                  value={formData.max_redemptions || ''}
                  onChange={(e) => setFormData({...formData, max_redemptions: e.target.value ? parseInt(e.target.value) : undefined})}
                  min="1"
                />
              </div>
              <div>
                <PInput
                  label={t('tenantSubscriptionCoupons.modal.expiresAtLabel')}
                  type="datetime-local"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData({...formData, expires_at: e.target.value || undefined})}
                />
              </div>
              <PCheckbox
                label={t('tenantSubscriptionCoupons.modal.activeLabel')}
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: (e.target as HTMLInputElement).checked})}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <PButton type="button" onClick={handleCancel} variant="secondary">
                  {t('tenantSubscriptionCoupons.actions.cancel')}
                </PButton>
                <PButton type="submit">
                  {editingCoupon ? t('tenantSubscriptionCoupons.actions.update') : t('tenantSubscriptionCoupons.actions.create')}
                </PButton>
              </div>
            </form>
        </Modal>
      )}

      {/*  */}
      {showDeleteModal && deleteTarget && (
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title={t('tenantSubscriptionCoupons.deleteModal.title')}
          widthClass="max-w-md"
        >
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-gray-500 text-center mb-6">
              {t('tenantSubscriptionCoupons.deleteModal.description', { name: deleteTarget.Name, code: deleteTarget.Code })}
            </p>
            <div className="flex justify-center space-x-3">
              <PButton
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                variant="secondary"
              >
                {t('tenantSubscriptionCoupons.actions.cancel')}
              </PButton>
              <PButton
                onClick={handleDeleteConfirm}
                disabled={deleting}
                variant="danger"
              >
                {deleting ? t('tenantSubscriptionCoupons.deleteModal.deleting') : t('tenantSubscriptionCoupons.deleteModal.confirmDelete')}
              </PButton>
            </div>
        </Modal>
      )}
    </TenantLayout>
  )
}
