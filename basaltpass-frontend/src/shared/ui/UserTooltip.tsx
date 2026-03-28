import React, { useEffect, useState } from 'react'
import { adminUserApi, type AdminUserSummary } from '@api/admin/user'
import { EnvelopeIcon, IdentificationIcon, UserCircleIcon } from '@heroicons/react/24/outline'

const userSummaryCache = new Map<number, AdminUserSummary>()

interface UserTooltipProps {
  userId?: number
  fallbackLabel?: string
}

const UserTooltip: React.FC<UserTooltipProps> = ({ userId, fallbackLabel = '未分配' }) => {
  const [user, setUser] = useState<AdminUserSummary | null>(userId ? userSummaryCache.get(userId) ?? null : null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setUser(null)
      return
    }

    const cached = userSummaryCache.get(userId)
    if (cached) {
      setUser(cached)
      return
    }

    let cancelled = false
    setLoading(true)
    adminUserApi.getUserSummary(userId)
      .then((summary) => {
        if (cancelled) {
          return
        }
        userSummaryCache.set(userId, summary)
        setUser(summary)
      })
      .catch((error) => {
        console.error('Failed to load user summary:', error)
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  if (!userId) {
    return <span>{fallbackLabel}</span>
  }

  const label = user?.nickname || user?.email || (loading ? `用户 #${userId}` : fallbackLabel)

  return (
    <div className="group relative inline-flex items-center">
      <span className="cursor-default border-b border-dotted border-gray-300 text-gray-700">
        {label}
      </span>

      <div className="pointer-events-none absolute left-0 top-full z-50 hidden min-w-72 translate-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-2xl group-hover:block">
        <div className="flex items-start gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={label}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <UserCircleIcon className="h-8 w-8" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-gray-900">{label}</div>
            <div className="mt-1 space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <IdentificationIcon className="h-4 w-4 text-gray-400" />
                <span>ID: {userId}</span>
              </div>
              <div className="flex items-center gap-2">
                <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                <span className="truncate">{user?.email || '未加载邮箱'}</span>
              </div>
              {user?.phone && <div>手机: {user.phone}</div>}
              <div>Tenant ID: {user?.tenant_id ?? 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserTooltip
