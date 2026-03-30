import React, { useState, useEffect } from 'react'
import { adminListCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon } from '@api/subscription/subscription'
import { Coupon } from '@types/domain/subscription'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import AdminLayout from '@features/admin/components/AdminLayout'
import { PButton, PCard, PInput, PPageHeader, PSelect } from '@ui'

export default function AdminCoupons() {
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
      
      // 根据你提供的API响应结构进行解析
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
      console.error('获取优惠券列表失败:', error)
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
      console.error('操作失败:', error)
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
      console.error('删除失败:', error)
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
      return `${(value / 100).toFixed(2)} 元`
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  if (loading) {
    return (
      <AdminLayout title="优惠券管理">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="优惠券管理">
      <div className="space-y-6">
        <PPageHeader
          title="优惠券管理"
          description="统一管理后台优惠券、折扣规则和有效期配置"
          actions={<PButton onClick={() => setShowModal(true)}>新建优惠券</PButton>}
        />

        <PCard className="overflow-hidden rounded-xl p-0 shadow-sm">
          {/* 调试信息 */}
          <div className="p-4 bg-gray-100 text-sm">
            <p>优惠券数量: {coupons.length}</p>
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
                                已禁用
                              </span>
                            )}
                            {isExpired(coupon.ExpiresAt) && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                已过期
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-900">
                            {coupon.Name}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            折扣: {formatDiscount(coupon.DiscountType, coupon.DiscountValue)} |
                            持续时间: {coupon.Duration === 'once' ? '一次性' : coupon.Duration === 'repeating' ? `重复${coupon.DurationInCycles}次` : '永久'} |
                            已使用: {coupon.RedeemedCount}
                            {coupon.MaxRedemptions && ` / ${coupon.MaxRedemptions}`} |
                            {coupon.ExpiresAt ? `过期时间: ${new Date(coupon.ExpiresAt).toLocaleDateString('zh-CN')}` : '永久有效'}
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
                        编辑
                      </PButton>
                      <PButton
                        onClick={() => handleDeleteClick(coupon)}
                        variant="ghost"
                        size="sm"
                        className="px-2 text-red-600 hover:text-red-900"
                      >
                        删除
                      </PButton>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-gray-500">
                暂无优惠券数据
              </li>
            )}
          </ul>
        </PCard>

      {showModal && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center pt-10">
          <div className="w-3/4 max-w-4xl rounded-2xl border bg-white p-6 shadow-xl">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                {editingCoupon ? '编辑优惠券' : '新建优惠券'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 第一行：优惠券代码和优惠券名称 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">优惠券代码</label>
                    <PInput
                      type="text"
                      required
                      disabled={!!editingCoupon}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="例如: SAVE20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">优惠券名称</label>
                    <PInput
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="例如: 新用户专享优惠"
                    />
                  </div>
                </div>

                {/* 第二行：折扣类型和持续时间 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">折扣类型</label>
                    <PSelect
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      options={[
                        { value: 'percent', label: '百分比折扣' },
                        { value: 'fixed_amount', label: '固定金额' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">持续时间</label>
                    <PSelect
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      options={[
                        { value: 'once', label: '一次性' },
                        { value: 'repeating', label: '重复' },
                        { value: 'forever', label: '永久' }
                      ]}
                    />
                  </div>
                </div>

                {/* 第三行：折扣值和重复周期数 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      折扣值 {formData.discount_type === 'percent' ? '(%)' : '(分)'}
                    </label>
                    <PInput
                      type="number"
                      required
                      min="1"
                      max={formData.discount_type === 'percent' ? '100' : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === 'percent' ? '例如: 20' : '例如: 1000 (10元)'}
                    />
                  </div>
                  {formData.duration === 'repeating' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">重复周期数</label>
                      <PInput
                        type="number"
                        min="1"
                        value={formData.duration_in_cycles}
                        onChange={(e) => setFormData({ ...formData, duration_in_cycles: e.target.value })}
                        placeholder="例如: 3"
                      />
                    </div>
                  )}
                </div>

                {/* 第四行：最大使用次数和过期时间 */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">最大使用次数（可选）</label>
                    <PInput
                      type="number"
                      min="1"
                      value={formData.max_redemptions}
                      onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                      placeholder="留空表示无限制"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">过期时间（可选）</label>
                    <PInput
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                {/* 第五行：激活状态 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    激活状态
                  </label>
                </div>

                {/* 按钮区域 */}
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
                    取消
                  </PButton>
                  <PButton
                    type="submit"
                  >
                    {editingCoupon ? '更新' : '创建'}
                  </PButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 删除优惠券确认模态框 */}
      {showDeleteModal && deleteTarget && (
        <div className="fixed inset-0 !m-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto w-96 rounded-2xl border bg-white p-5 shadow-xl">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">
                确认删除优惠券
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  您确定要删除以下优惠券吗？
                </p>
                <div className="mt-3 rounded-lg bg-gray-50 p-3">
                  <p className="text-sm font-medium text-gray-900">
                    {deleteTarget!.Code}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {deleteTarget!.Name}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    折扣: {formatDiscount(deleteTarget!.DiscountType, deleteTarget!.DiscountValue)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    持续时间: {deleteTarget!.Duration === 'once' ? '一次性' : deleteTarget!.Duration === 'repeating' ? `重复${deleteTarget!.DurationInCycles}次` : '永久'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    已使用: {deleteTarget!.RedeemedCount}
                    {deleteTarget!.MaxRedemptions && ` / ${deleteTarget!.MaxRedemptions}`}
                  </p>
                  {deleteTarget!.ExpiresAt && (
                    <p className="text-sm text-gray-500 mt-1">
                      过期时间: {new Date(deleteTarget!.ExpiresAt!).toLocaleDateString('zh-CN')}
                    </p>
                  )}
                  <div className="mt-2 flex space-x-2">
                    {!deleteTarget!.IsActive && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        已禁用
                      </span>
                    )}
                    {isExpired(deleteTarget!.ExpiresAt) && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        已过期
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  删除后，该优惠券将无法恢复，可能影响现有的订阅。
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <PButton
                  onClick={handleDeleteCancel}
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
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  )
} 
