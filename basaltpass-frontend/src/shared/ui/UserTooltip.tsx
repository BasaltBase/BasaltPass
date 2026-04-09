import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { adminUserApi, type AdminUserSummary } from '@api/admin/user'
import { EnvelopeIcon, IdentificationIcon, UserCircleIcon } from '@heroicons/react/24/outline'

const userSummaryCache = new Map<number, AdminUserSummary>()

interface UserTooltipProps {
  userId?: number
  fallbackLabel?: string
  triggerLabel?: string
  className?: string
}

const UserTooltip: React.FC<UserTooltipProps> = ({
  userId,
  fallbackLabel = 'nottranslated',
  triggerLabel,
  className = 'cursor-default border-b border-dotted border-gray-300 text-gray-700'
}) => {
  const [user, setUser] = useState<AdminUserSummary | null>(userId ? userSummaryCache.get(userId) ?? null : null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement | null>(null)

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

  const label = triggerLabel || user?.nickname || user?.email || (loading ? `user #${userId}` : fallbackLabel)
  const email = user?.email || 'nottranslatedemail'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      return
    }

    const updatePosition = () => {
      if (!triggerRef.current) {
        return
      }

      const rect = triggerRef.current.getBoundingClientRect()
      const tooltipWidth = 288
      const left = Math.min(
        Math.max(12, rect.left),
        Math.max(12, window.innerWidth - tooltipWidth - 12)
      )

      setTooltipStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left,
        width: tooltipWidth,
        zIndex: 9999
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  return (
    <div
      ref={triggerRef}
      className="inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className={className}>
        {label}
      </span>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="pointer-events-none rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-2xl" style={tooltipStyle}>
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
                  <span className="truncate">{email}</span>
                </div>
                {user?.phone && <div>translated: {user.phone}</div>}
                <div>Tenant ID: {user?.tenant_id ?? 0}</div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default UserTooltip
