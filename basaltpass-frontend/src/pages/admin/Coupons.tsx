import React, { useState, useEffect } from 'react'
import Layout from '../../components/Layout'
import { adminListCoupons, adminCreateCoupon, adminUpdateCoupon, adminDeleteCoupon } from '../../api/subscription'
import { Coupon } from '../../types/subscription'

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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
      console.log('API响应:', res) // 调试信息
      
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
      
      console.log('解析后的优惠券列表:', list) // 调试信息
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

  const handleDelete = async (code: string) => {
    if (confirm('确定要删除这个优惠券吗？')) {
      try {
        await adminDeleteCoupon(code)
        fetchCoupons()
      } catch (error) {
        console.error('删除失败:', error)
      }
    }
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
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">优惠券管理</h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            新建优惠券
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
                      <button
                        onClick={() => handleEdit(coupon)}
                        className="text-indigo-600 hover:text-indigo-900 text-sm"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(coupon.Code)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        删除
                      </button>
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
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingCoupon ? '编辑优惠券' : '新建优惠券'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">优惠券代码</label>
                    <input
                      type="text"
                      required
                      disabled={!!editingCoupon}
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="例如: SAVE20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">优惠券名称</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="例如: 新用户专享优惠"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">折扣类型</label>
                    <select
                      value={formData.discount_type}
                      onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="percent">百分比折扣</option>
                      <option value="fixed_amount">固定金额</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">持续时间</label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="once">一次性</option>
                      <option value="repeating">重复</option>
                      <option value="forever">永久</option>
                    </select>
                  </div>
                  {formData.duration === 'repeating' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">重复周期数</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.duration_in_cycles}
                        onChange={(e) => setFormData({ ...formData, duration_in_cycles: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="例如: 3"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      折扣值 {formData.discount_type === 'percentage' ? '(%)' : '(分)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={formData.discount_type === 'percentage' ? '100' : undefined}
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder={formData.discount_type === 'percentage' ? '例如: 20' : '例如: 1000 (10元)'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">最大使用次数（可选）</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.max_redemptions}
                      onChange={(e) => setFormData({ ...formData, max_redemptions: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="留空表示无限制"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">过期时间（可选）</label>
                    <input
                      type="date"
                      value={formData.expires_at}
                      onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
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
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
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
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      {editingCoupon ? '更新' : '创建'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
} 