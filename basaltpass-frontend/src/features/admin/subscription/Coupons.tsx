import React, { useState, useEffect } from 'react'
import { adminListCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon } from '@api/subscription/subscription'
import { Coupon } from '@types/domain/subscription'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PButton, PCard, PInput, PPageHeader, PSelect } from '@ui'
import { useI18n } from '@shared/i18n'

export default function AdminCoupons() {
  const { t, locale } = useI18n()
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discount_type: 'percent',
    discount_value: '',
    duration: 'once',
    duration_in_cycles: '',
    max_redemptions: '',
    expires_at: '',
    is_active: true
  })

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      setLoading(true)
      const res = await adminListCoupons()
      
      
      const raw = res.data
      let list: any = []
      
      if (Array.isArray(raw)) {
        list = raw
      } else if (raw && Array.isArray(raw.data)) {
        list = raw.data
      } else if (raw && raw.data && Array.isArray(raw.data.Data)) {
        list = raw.data.Data
      } else if (raw && Array.isArray(raw.Data)) {
        list = raw.Data
      }
      
      
      setCoupons(list)
    } catch (error) {
      console.error(t('adminSubscriptionCoupons.logs.fetchCouponsFailed'), error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const submitData = {
        ...formData,
        discount_value: parseInt(formData.discount_value),
        duration_in_cycles: formData.duration_in_cycles ? parseInt(formData.duration_in_cycles) : null,
        max_redemptions: formData.max_redemptions ? parseInt(formData.max_redemptions) : null,
        expires_at: formData.expires_at || null
      }
      
      if (editingCoupon) {
        await adminUpdateCoupon(editingCoupon.Code, submitData)
      } else {
        await adminCreateCoupon(submitData)
      }
      setShowModal(false)
      setEditingCoupon(null)
      setFormData({
        code: '',
        name: '',
        discount_type: 'percent',
        discount_value: '',
        duration: 'once',
        duration_in_cycles: '',
        max_redemptions: '',
        expires_at: '',
        is_active: true
      })
      fetchCoupons()
    } catch (error) {
      console.error(t('adminSubscriptionCoupons.logs.operationFailed'), error)
    }
  }

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.Code,
      name: coupon.Name,
      discount_type: coupon.DiscountType,
      discount_value: coupon.DiscountValue.toString(),
      duration: coupon.Duration,
      duration_in_cycles: coupon.DurationInCycles?.toString() || '',
      max_redemptions: coupon.MaxRedemptions?.toString() || '',
      expires_at: coupon.ExpiresAt || '',
      is_active: coupon.IsActive
    })
    setShowModal(true)
  }

  const handleDeleteClick = (coupon: Coupon) => {
    setDeleteTarget(coupon)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    
    try {
      setDeleting(true)
      await adminDeleteCoupon(deleteTarget.Code)
      await fetchCoupons()
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error(t('adminSubscriptionCoupons.logs.deleteFailed'), error)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const formatDiscount = (type: string, value: number) => {
    if (type === 'percent') {
      return `${value}%`
    } else {
      return `${(value / 100).toFixed(2)} ${t('adminSubscriptionCoupons.common.currencyYuan')}`
    }
  }

  const formatDuration = (duration: string, durationInCycles?: number) => {
    if (duration === 'once') return t('adminSubscriptionCoupons.duration.once')
    if (duration === 'repeating') return t('adminSubscriptionCoupons.duration.repeating', { cycles: durationInCycles || 0 })
    return t('adminSubscriptionCoupons.duration.forever')
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <AdminLayout title={t('adminSubscriptionCoupons.layoutTitle')}>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">{t('adminSubscriptionCoupons.common.loading')}</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title={t('adminSubscriptionCoupons.layoutTitle')}>
      <div className="space-y-6">
        <PPageHeader
          title={t('adminSubscriptionCoupons.title')}
          description={t('adminSubscriptionCoupons.description')}
          actions={<PButton onClick={() => setShowModal(true)}>{t('adminSubscriptionCoupons.actions.createCoupon')}</PButton>}
        />

        <PCard className="overflow-hidden rounded-xl p-0 shadow-sm">
          <div className="p-4 bg-gray-100 text-sm">
            <p>{t('adminSubscriptionCoupons.meta.count', { count: coupons.length })}</p>
          </div>
          <ul className="divide-y divide-gray-200">
            {coupons && coupons.length > 0 ? (
              coupons.map((coupon) => (
                <li key={coupon.ID}>
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {coupon.Code}
                            </p>
                            {!coupon.IsActive && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {t('adminSubscriptionCoupons.status.disabled')}
                              </span>
                            )}
                            {isExpired(coupon.ExpiresAt) && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {t('adminSubscriptionCoupons.status.expired')}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-900">
                            {coupon.Name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {t('adminSubscriptionCoupons.meta.discount', { value: formatDiscount(coupon.DiscountType, coupon.DiscountValue) })} |
                            {t('adminSubscriptionCoupons.meta.duration', { value: formatDuration(coupon.Duration, coupon.DurationInCycles || undefined) })} |
                            {t('adminSubscriptionCoupons.meta.redeemed', { count: coupon.RedeemedCount })}
                            {coupon.MaxRedemptions && ` / ${coupon.MaxRedemptions}`} |
                            {coupon.ExpiresAt ? t('adminSubscriptionCoupons.meta.expiresAt', { date: new Date(coupon.ExpiresAt).toLocaleDateString(locale) }) : t('adminSubscriptionCoupons.meta.noExpiry')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <PButton
                        onClick={() => handleEdit(coupon)}
                        variant="ghost"
                        size="sm"
                        className="px-2 text-indigo-600 hover:text-indigo-900"
                      >
                        {t('adminSubscriptionCoupons.actions.edit')}
                      </PButton>
                      <PButton
                        onClick={() => handleDeleteClick(coupon)}
                        variant="ghost"
                        size="sm"
                        className="px-2 text-red-600 hover:text-red-900"
                      >
                        {t('adminSubscriptionCoupons.actions.delete')}
                      </PButton>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
                {t('adminSubscriptionCoupons.empty.noCoupons')}
              </li>
            )}
          </ul>
        </PCard>

      {showModal && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingCoupon ? t('adminSubscriptionCoupons.modal.editTitle') : t('adminSubscriptionCoupons.modal.createTitle')}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.code')}</label>
                    <PInput
                      type="text"
                      required
                      disabled={!!editingCoupon}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder={t('adminSubscriptionCoupons.form.codePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.name')}</label>
                    <PInput
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('adminSubscriptionCoupons.form.namePlaceholder')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.discountType')}</label>
                    <PSelect
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      options={[
                        { value: 'percent', label: t('adminSubscriptionCoupons.discountType.percent') },
                        { value: 'fixed_amount', label: t('adminSubscriptionCoupons.discountType.fixedAmount') }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.duration')}</label>
                    <PSelect
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      options={[
                        { value: 'once', label: t('adminSubscriptionCoupons.duration.once') },
                        { value: 'repeating', label: t('adminSubscriptionCoupons.duration.repeatingLabel') },
                        { value: 'forever', label: t('adminSubscriptionCoupons.duration.forever') }
                      ]}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('adminSubscriptionCoupons.form.discountValue')} {formData.discount_type === 'percent' ? '(%)' : t('adminSubscriptionCoupons.form.centsSuffix')}
                    </label>
                    <PInput
                      type="number"
                      required
                      min="1"
                      max={formData.discount_type === 'percent' ? '100' : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percent' ? t('adminSubscriptionCoupons.form.discountPercentPlaceholder') : t('adminSubscriptionCoupons.form.discountFixedPlaceholder')}
                    />
                  </div>
                  {formData.duration === 'repeating' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.repeatCycles')}</label>
                      <PInput
                        type="number"
                        min="1"
                        value={formData.duration_in_cycles}
                        onChange={(e) => setFormData({ ...formData, duration_in_cycles: e.target.value })}
                        placeholder={t('adminSubscriptionCoupons.form.repeatCyclesPlaceholder')}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.maxRedemptions')}</label>
                    <PInput
                      type="number"
                      min="1"
                      value={formData.max_redemptions}
                      onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                      placeholder={t('adminSubscriptionCoupons.form.maxRedemptionsPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('adminSubscriptionCoupons.form.expiresAt')}</label>
                    <PInput
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    {t('adminSubscriptionCoupons.form.activeStatus')}
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <PButton
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingCoupon(null)
                      setFormData({
                        code: '',
                        name: '',
                        discount_type: 'percent',
                        discount_value: '',
                        duration: 'once',
                        duration_in_cycles: '',
                        max_redemptions: '',
                        expires_at: '',
                        is_active: true
                      })
                    }}
                    variant="secondary"
                  >
                    {t('adminSubscriptionCoupons.actions.cancel')}
                  </PButton>
                  <PButton
                    type="submit"
                  >
                    {editingCoupon ? t('adminSubscriptionCoupons.actions.update') : t('adminSubscriptionCoupons.actions.create')}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                {t('adminSubscriptionCoupons.deleteModal.title')}
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  {t('adminSubscriptionCoupons.deleteModal.confirmText')}
                </p>
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteTarget!.Code}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {deleteTarget!.Name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionCoupons.deleteModal.discount', { value: formatDiscount(deleteTarget!.DiscountType, deleteTarget!.DiscountValue) })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionCoupons.deleteModal.duration', { value: formatDuration(deleteTarget!.Duration, deleteTarget!.DurationInCycles || undefined) })}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('adminSubscriptionCoupons.deleteModal.redeemed', { count: deleteTarget!.RedeemedCount })}
                    {deleteTarget!.MaxRedemptions && ` / ${deleteTarget!.MaxRedemptions}`}
                  </p>
                  {deleteTarget!.ExpiresAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      {t('adminSubscriptionCoupons.deleteModal.expiresAt', { date: new Date(deleteTarget!.ExpiresAt!).toLocaleDateString(locale) })}
                    </p>
                  )}
                  <div className="mt-2 flex space-x-2">
                    {!deleteTarget!.IsActive && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {t('adminSubscriptionCoupons.status.disabled')}
                      </span>
                    )}
                    {isExpired(deleteTarget!.ExpiresAt) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {t('adminSubscriptionCoupons.status.expired')}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  {t('adminSubscriptionCoupons.deleteModal.warning')}
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  variant="secondary"
                >
                  {t('adminSubscriptionCoupons.actions.cancel')}
                </PButton>
                <PButton
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  variant="danger"
                >
                  {deleting ? t('adminSubscriptionCoupons.deleteModal.deleting') : t('adminSubscriptionCoupons.deleteModal.confirmDelete')}
                </PButton>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
} 
