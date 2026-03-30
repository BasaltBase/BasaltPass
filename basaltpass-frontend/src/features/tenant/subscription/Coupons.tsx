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
import { PSkeleton, PBadge, PButton, PInput, PSelect, PCheckbox, Modal, PPageHeader } from '@ui'

export default function TenantCoupons() {
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
    
    // 检查是否需要自动打开创建模态框
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
      console.error('获取优惠券列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // 处理 discount_value 数据转换
      const submitData = {
        ...formData,
        discount_value: formData.discount_type === 'fixed' 
          ? Math.round(formData.discount_value * 100) // 固定金额：元转分
          : Math.round(formData.discount_value) // 百分比：保持整数
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
      console.error('操作失败:', error)
    }
  }

  const handleEdit = (coupon: TenantCoupon) => {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.Code,
      name: coupon.Name,
      discount_type: coupon.DiscountType,
      discount_value: coupon.DiscountType === 'fixed' 
        ? Math.round(coupon.DiscountValue / 100 * 100) / 100 // 分转元，保留2位小数
        : coupon.DiscountValue, // 百分比直接使用
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
      console.error('删除失败:', error)
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
        return '一次性'
      case 'repeating':
        return cycles ? `重复 ${cycles} 次` : '重复'
      case 'forever':
        return '永久'
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
          {/* 页面头部 */}
          <PPageHeader
            title="优惠券管理"
            description="创建、编辑和停用订阅优惠券"
            actions={
              <PButton type="button" onClick={() => setShowModal(true)} leftIcon={<PlusIcon className="h-5 w-5" />}>
                创建优惠券
              </PButton>
            }
          />

          {/* 优惠券列表 */}
          <div className="mt-8">
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <ul className="divide-y divide-gray-200">
                {coupons.length === 0 ? (
                  <li className="px-6 py-8 text-center text-gray-500">
                    暂无优惠券数据
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
                                  <CheckCircleIcon className="h-5 w-5 text-green-500" title="活跃" />
                                ) : (
                                  <XCircleIcon className="h-5 w-5 text-red-500" title="停用" />
                                )}
                                {isExpired(coupon.ExpiresAt) && (
                                  <PBadge variant="error">已过期</PBadge>
                                )}
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                                <span>折扣: {formatDiscount(coupon.DiscountType, coupon.DiscountValue)}</span>
                                <span>持续时间: {formatDuration(coupon.Duration, coupon.DurationInCycles)}</span>
                                <span>已使用: {coupon.RedeemedCount} 次</span>
                                {coupon.MaxRedemptions && (
                                  <span>最大使用: {coupon.MaxRedemptions} 次</span>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-600">
                                <div className="flex items-center space-x-4">
                                  <span>创建时间: {new Date(coupon.CreatedAt).toLocaleString('zh-CN')}</span>
                                  {coupon.ExpiresAt && (
                                    <span>过期时间: {new Date(coupon.ExpiresAt).toLocaleString('zh-CN')}</span>
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
                            title="编辑"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(coupon)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="删除"
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

      {/* 创建/编辑优惠券模态框 */}
      {showModal && (
        <Modal
          open={showModal}
          onClose={handleCancel}
          title={editingCoupon ? '编辑优惠券' : '创建优惠券'}
          widthClass="max-w-md"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <PInput
                  label="优惠券代码"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  required
                  disabled={!!editingCoupon}
                  placeholder="例: SAVE20"
                />
              </div>
              <div>
                <PInput
                  label="优惠券名称"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <PSelect
                  label="折扣类型"
                  value={formData.discount_type}
                  onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percent' | 'fixed'})}
                  required
                >
                  <option value="percent">百分比</option>
                  <option value="fixed">固定金额</option>
                </PSelect>
              </div>
              <div>
                <PInput
                  label="折扣值"
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                  min="0"
                  step={formData.discount_type === 'percent' ? '1' : '0.01'}
                  max={formData.discount_type === 'percent' ? '100' : undefined}
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  {formData.discount_type === 'percent' ? '输入百分比（如：20 表示 20%）' : '输入金额（单位：元）'}
                </p>
              </div>
              <div>
                <PSelect
                  label="持续时间"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value as 'once' | 'repeating' | 'forever'})}
                  required
                >
                  <option value="once">一次性</option>
                  <option value="repeating">重复</option>
                  <option value="forever">永久</option>
                </PSelect>
              </div>
              {formData.duration === 'repeating' && (
                <div>
                  <PInput
                    label="重复次数"
                    type="number"
                    value={formData.duration_in_cycles || ''}
                    onChange={(e) => setFormData({...formData, duration_in_cycles: e.target.value ? parseInt(e.target.value) : undefined})}
                    min="1"
                  />
                </div>
              )}
              <div>
                <PInput
                  label="最大使用次数（可选）"
                  type="number"
                  value={formData.max_redemptions || ''}
                  onChange={(e) => setFormData({...formData, max_redemptions: e.target.value ? parseInt(e.target.value) : undefined})}
                  min="1"
                />
              </div>
              <div>
                <PInput
                  label="过期时间（可选）"
                  type="datetime-local"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData({...formData, expires_at: e.target.value || undefined})}
                />
              </div>
              <PCheckbox
                label="启用优惠券"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: (e.target as HTMLInputElement).checked})}
              />
              <div className="flex justify-end space-x-3 pt-4">
                <PButton type="button" onClick={handleCancel} variant="secondary">
                  取消
                </PButton>
                <PButton type="submit">
                  {editingCoupon ? '更新' : '创建'}
                </PButton>
              </div>
            </form>
        </Modal>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <Modal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="确认删除"
          widthClass="max-w-md"
        >
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <p className="text-sm text-gray-500 text-center mb-6">
              确定要删除优惠券 "{deleteTarget.Name}" ({deleteTarget.Code}) 吗？此操作无法撤销。
            </p>
            <div className="flex justify-center space-x-3">
              <PButton
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                variant="secondary"
              >
                取消
              </PButton>
              <PButton
                onClick={handleDeleteConfirm}
                disabled={deleting}
                variant="danger"
              >
                {deleting ? '删除中...' : '确认删除'}
              </PButton>
            </div>
        </Modal>
      )}
    </TenantLayout>
  )
}
