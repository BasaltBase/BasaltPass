import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import TenantLayout from '@features/tenant/components/TenantLayout'
import {
  ChevronRightIcon,
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
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </TenantLayout>
    )
  }

  return (
    <TenantLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 页面头部 */}
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  <li>
                    <Link to={ROUTES.tenant.subscriptions} className="text-gray-400 hover:text-gray-500">
                      订阅管理
                    </Link>
                  </li>
                  <li>
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </li>
                  <li>
                    <span className="text-gray-900">优惠券管理</span>
                  </li>
                </ol>
              </nav>
              <h2 className="mt-2 text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                优惠券管理
              </h2>
            </div>
            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                创建优惠券
              </button>
            </div>
          </div>

          {/* 优惠券列表 */}
          <div className="mt-8">
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {coupon.Code}
                                </span>
                                {coupon.IsActive ? (
                                  <CheckCircleIcon className="h-5 w-5 text-green-500" title="活跃" />
                                ) : (
                                  <XCircleIcon className="h-5 w-5 text-red-500" title="停用" />
                                )}
                                {isExpired(coupon.ExpiresAt) && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    已过期
                                  </span>
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
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="编辑"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(coupon)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {editingCoupon ? '编辑优惠券' : '创建优惠券'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">优惠券代码</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={!!editingCoupon}
                  placeholder="例: SAVE20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">优惠券名称</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">折扣类型</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({...formData, discount_type: e.target.value as 'percent' | 'fixed'})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="percent">百分比</option>
                  <option value="fixed">固定金额</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">折扣值</label>
                <input
                  type="number"
                  value={formData.discount_value}
                  onChange={(e) => setFormData({...formData, discount_value: parseFloat(e.target.value) || 0})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                <label className="block text-sm font-medium text-gray-700">持续时间</label>
                <select
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value as 'once' | 'repeating' | 'forever'})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="once">一次性</option>
                  <option value="repeating">重复</option>
                  <option value="forever">永久</option>
                </select>
              </div>
              {formData.duration === 'repeating' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">重复次数</label>
                  <input
                    type="number"
                    value={formData.duration_in_cycles || ''}
                    onChange={(e) => setFormData({...formData, duration_in_cycles: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    min="1"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700">最大使用次数（可选）</label>
                <input
                  type="number"
                  value={formData.max_redemptions || ''}
                  onChange={(e) => setFormData({...formData, max_redemptions: e.target.value ? parseInt(e.target.value) : undefined})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">过期时间（可选）</label>
                <input
                  type="datetime-local"
                  value={formData.expires_at || ''}
                  onChange={(e) => setFormData({...formData, expires_at: e.target.value || undefined})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">启用优惠券</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {editingCoupon ? '更新' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-center text-gray-900 mb-2">确认删除</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              确定要删除优惠券 "{deleteTarget.Name}" ({deleteTarget.Code}) 吗？此操作无法撤销。
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={deleting}
              >
                取消
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </TenantLayout>
  )
}
