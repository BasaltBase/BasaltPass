import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import TenantLayout from '@components/TenantLayout'
import { getTenantUserSubscription, Subscription, tenantSubscriptionAPI } from '@api/tenant/subscription'

function fmtDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString('zh-CN')
}

export default function TenantSubscriptionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState<Subscription | null>(null)

  const subscriptionId = Number(id)

  const fetchDetail = async () => {
    try {
      setLoading(true)
      setError('')

      if (!subscriptionId || Number.isNaN(subscriptionId)) {
        setError('订阅 ID 无效')
        return
      }

      const data = await getTenantUserSubscription(subscriptionId)
      setSubscription(data)
    } catch (err: any) {
      console.error('获取订阅详情失败:', err)
      setError(err?.response?.data?.error || '获取订阅详情失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId])

  const handleCancel = async () => {
    if (!subscription) return
    if (subscription.Status !== 'active') return

    const ok = window.confirm('确定要取消该订阅吗？')
    if (!ok) return

    const reason = window.prompt('取消原因（可选）') || undefined

    try {
      await tenantSubscriptionAPI.cancelSubscription(subscription.ID, { reason })
      await fetchDetail()
    } catch (err) {
      console.error('取消订阅失败:', err)
      window.alert('取消订阅失败，请重试')
    }
  }

  if (loading) {
    return (
      <TenantLayout title="订阅详情">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </TenantLayout>
    )
  }

  if (error || !subscription) {
    return (
      <TenantLayout title="订阅详情">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{error || '未找到订阅'}</h3>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                返回
              </button>
              <button
                onClick={fetchDetail}
                className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </TenantLayout>
    )
  }

  const status = tenantSubscriptionAPI.formatSubscriptionStatus(subscription.Status)
  const statusClassName =
    status.color === 'green'
      ? 'bg-green-100 text-green-800'
      : status.color === 'red'
        ? 'bg-red-100 text-red-800'
        : status.color === 'yellow'
          ? 'bg-yellow-100 text-yellow-800'
          : status.color === 'orange'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-gray-100 text-gray-800'

  return (
    <TenantLayout title="订阅详情">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link to="/tenant/subscriptions/subscriptions" className="text-sm text-gray-500 hover:text-gray-700">
                ← 返回订阅列表
              </Link>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName}`}>
                {status.text}
              </span>
            </div>
            <h1 className="mt-2 text-xl font-semibold text-gray-900">订阅 #{subscription.ID}</h1>
            <p className="mt-1 text-sm text-gray-500">用户 {subscription.UserID} · 创建于 {fmtDate(subscription.CreatedAt)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/tenant/subscriptions/subscriptions`)}
              className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm hover:bg-gray-50"
            >
              返回
            </button>
            <button
              onClick={handleCancel}
              disabled={subscription.Status !== 'active'}
              className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
            >
              取消订阅
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-medium text-gray-900">基础信息</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500">订阅状态</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.Status}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">数量</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.Quantity ?? 1}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">当前计费周期</div>
              <div className="mt-1 text-sm text-gray-900">
                {fmtDate(subscription.CurrentPeriodStart)} ~ {fmtDate(subscription.CurrentPeriodEnd)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">开始时间</div>
              <div className="mt-1 text-sm text-gray-900">{fmtDate(subscription.StartAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">取消时间</div>
              <div className="mt-1 text-sm text-gray-900">{fmtDate(subscription.CanceledAt)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">计划取消时间</div>
              <div className="mt-1 text-sm text-gray-900">{fmtDate(subscription.CancelAt)}</div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-medium text-gray-900">价格 / 套餐</h2>
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-gray-500">当前 Price ID</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.CurrentPriceID}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">下一期 Price ID</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.NextPriceID ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">优惠券</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.CouponID ?? '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">网关订阅 ID</div>
              <div className="mt-1 text-sm text-gray-900">{subscription.GatewaySubscriptionID ?? '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </TenantLayout>
  )
}
