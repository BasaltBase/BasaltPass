import React from 'react'

// ─────────────────────────────────────────────
// translated PSkeleton
// ─────────────────────────────────────────────

interface PSkeletonProps {
  /** translated */
  variant?: 'text' | 'circle' | 'rect' | 'button'
  /** translated（Tailwind translatedor CSS value）*/
  width?: string
  /** translated（Tailwind translatedor CSS value）*/
  height?: string
  /** translated */
  lines?: number
  /** isnotranslated */
  animated?: boolean
  className?: string
}

function PSkeletonBase({
  variant = 'rect',
  width,
  height,
  lines = 3,
  animated = true,
  className = '',
}: PSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const base = `bg-gray-200 ${pulse}`

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded ${base} ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
            style={height ? { height } : undefined}
          />
        ))}
      </div>
    )
  }

  if (variant === 'circle') {
    const size = width || height || '3rem'
    return (
      <div
        className={`rounded-full ${base} ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  // rect / button
  const borderRadius = variant === 'button' ? 'rounded-md' : 'rounded'
  return (
    <div
      className={`${borderRadius} ${base} ${className}`}
      style={{
        width: width || '100%',
        height: height || (variant === 'button' ? '2.5rem' : '1rem'),
      }}
    />
  )
}

PSkeletonBase.displayName = 'PSkeleton'

// ─────────────────────────────────────────────
// translated：translated
// ─────────────────────────────────────────────

interface CardSkeletonProps {
  /** isnotranslated/translated */
  showIcon?: boolean
  /** translated */
  lines?: number
  /** isnotranslated */
  showFooter?: boolean
  animated?: boolean
  className?: string
}

function CardSkeleton({
  showIcon = true,
  lines = 3,
  showFooter = false,
  animated = true,
  className = '',
}: CardSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`bg-white rounded-lg shadow p-6 space-y-4 ${className}`}>
      {showIcon && (
        <div className="flex items-center space-x-3">
          <div className={`h-12 w-12 rounded-lg ${block}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-1/2 ${block}`} />
            <div className={`h-3 w-1/3 ${block}`} />
          </div>
        </div>
      )}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 ${block} ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
      {showFooter && (
        <div className="flex justify-end space-x-2 pt-2">
          <div className={`h-8 w-20 rounded-md ${block}`} />
          <div className={`h-8 w-20 rounded-md ${block}`} />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：apptranslated（3 translated）
// ─────────────────────────────────────────────

interface AppCardGridSkeletonProps {
  count?: number
  animated?: boolean
  className?: string
}

function AppCardGridSkeleton({
  count = 6,
  animated = true,
  className = '',
}: AppCardGridSkeletonProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} showIcon showFooter={false} lines={2} animated={animated} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：detailstranslated（translated + translatedinfotranslated）
// ─────────────────────────────────────────────

interface DetailPageSkeletonProps {
  animated?: boolean
  className?: string
}

function DetailPageSkeleton({ animated = true, className = '' }: DetailPageSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`space-y-6 ${className}`}>
      {/* translatedback + translated */}
      <div className="flex items-center space-x-3">
        <div className={`h-8 w-8 rounded ${block}`} />
        <div className={`h-7 w-48 ${block}`} />
        <div className={`h-5 w-16 rounded-full ml-2 ${block}`} />
      </div>

      {/* translatedinfotranslated */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className={`h-16 w-16 rounded-xl ${block}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-6 w-40 ${block}`} />
            <div className={`h-4 w-24 ${block}`} />
          </div>
          <div className={`h-8 w-24 rounded-md ${block}`} />
        </div>
        <div className="pt-2 space-y-2">
          <div className={`h-3 w-full ${block}`} />
          <div className={`h-3 w-5/6 ${block}`} />
          <div className={`h-3 w-3/4 ${block}`} />
        </div>
      </div>

      {/* infotranslated：translated */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-5 space-y-3">
            <div className={`h-4 w-1/3 ${block}`} />
            <div className={`h-8 w-full rounded ${block}`} />
            <div className={`h-3 w-2/3 ${block}`} />
          </div>
        ))}
      </div>

      {/* translated */}
      <div className="flex space-x-3">
        <div className={`h-9 w-28 rounded-md ${block}`} />
        <div className={`h-9 w-28 rounded-md ${block}`} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：translated
// ─────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number
  cols?: number
  animated?: boolean
  className?: string
}

function TableSkeleton({
  rows = 5,
  cols = 4,
  animated = true,
  className = '',
}: TableSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* translated */}
      <div className="border-b border-gray-100 px-4 py-3 flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-4 flex-1 ${block}`} style={{ maxWidth: i === 0 ? '6rem' : undefined }} />
        ))}
      </div>
      {/* translated */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="px-4 py-3 flex space-x-4 border-b border-gray-50">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={`h-4 flex-1 ${block}`}
              style={{ maxWidth: colIdx === 0 ? '6rem' : undefined, opacity: 1 - rowIdx * 0.08 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：listtranslated
// ─────────────────────────────────────────────

interface ListSkeletonProps {
  items?: number
  showAvatar?: boolean
  animated?: boolean
  className?: string
}

function ListSkeleton({
  items = 4,
  showAvatar = true,
  animated = true,
  className = '',
}: ListSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow px-4 py-3 flex items-center space-x-3">
          {showAvatar && <div className={`h-10 w-10 rounded-full flex-shrink-0 ${block}`} />}
          <div className="flex-1 space-y-2">
            <div className={`h-4 w-1/3 ${block}`} />
            <div className={`h-3 w-2/3 ${block}`} />
          </div>
          <div className={`h-6 w-16 rounded-full ${block}`} />
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：translatedroutetranslated（translated）
// ─────────────────────────────────────────────

interface PageLoaderProps {
  message?: string
  animated?: boolean
}

function PageLoader({ message = 'loading...', animated = true }: PageLoaderProps) {
  const pulse = animated ? 'animate-pulse' : ''
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-6 w-80">
        {/* Logo translated */}
        <div className={`h-12 w-12 rounded-2xl bg-gray-200 ${pulse}`} />
        {/* translated */}
        <div className="w-full space-y-3">
          <div className={`h-5 w-2/3 mx-auto rounded bg-gray-200 ${pulse}`} />
          <div className={`h-3 w-1/2 mx-auto rounded bg-gray-200 ${pulse}`} />
        </div>
        {/* translated */}
        <div className="w-full bg-gray-100 rounded-full h-1 overflow-hidden">
          <div
            className="h-1 bg-indigo-400 rounded-full"
            style={{
              animation: 'skeleton-slide 1.8s ease-in-out infinite',
              width: '40%',
            }}
          />
        </div>
        {message && <p className="text-sm text-gray-400">{message}</p>}
      </div>
      <style>{`
        @keyframes skeleton-slide {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：Dashboard translated（translated + translated）
// ─────────────────────────────────────────────

interface DashboardPageSkeletonProps {
  statsCount?: number
  animated?: boolean
  className?: string
}

function DashboardPageSkeleton({
  statsCount = 4,
  animated = true,
  className = '',
}: DashboardPageSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`space-y-6 ${className}`}>
      {/* translated */}
      <div className="space-y-2">
        <div className={`h-7 w-40 ${block}`} />
        <div className={`h-4 w-64 ${block}`} />
      </div>

      {/* translated */}
      <div className={`grid gap-4 grid-cols-2 lg:grid-cols-${Math.min(statsCount, 4)}`}>
        {Array.from({ length: statsCount }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-5 space-y-3">
            <div className="flex justify-between items-start">
              <div className={`h-4 w-24 ${block}`} />
              <div className={`h-8 w-8 rounded-lg ${block}`} />
            </div>
            <div className={`h-8 w-20 ${block}`} />
            <div className={`h-3 w-32 ${block}`} />
          </div>
        ))}
      </div>

      {/* translated/translated */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-5 space-y-4">
          <div className={`h-5 w-32 ${block}`} />
          <div className={`h-48 w-full rounded-lg ${block}`} />
        </div>
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <div className={`h-5 w-24 ${block}`} />
          <ListSkeleton items={4} showAvatar animated={animated} className="space-y-2" />
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：translatedmanagementtranslated（translated + translated）
// ─────────────────────────────────────────────

interface ManagementPageSkeletonProps {
  showSearch?: boolean
  rows?: number
  cols?: number
  animated?: boolean
  className?: string
}

function ManagementPageSkeleton({
  showSearch = true,
  rows = 5,
  cols = 4,
  animated = true,
  className = '',
}: ManagementPageSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`space-y-4 ${className}`}>
      {/* translated */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className={`h-6 w-36 ${block}`} />
          <div className={`h-3 w-52 ${block}`} />
        </div>
        <div className={`h-9 w-24 rounded-md ${block}`} />
      </div>

      {/* search/translated */}
      {showSearch && (
        <div className="flex space-x-3">
          <div className={`h-9 flex-1 max-w-xs rounded-md ${block}`} />
          <div className={`h-9 w-24 rounded-md ${block}`} />
        </div>
      )}

      {/* translated */}
      <TableSkeleton rows={rows} cols={cols} animated={animated} />
    </div>
  )
}

// ─────────────────────────────────────────────
// translated：translated（translated + translatedlist）
// ─────────────────────────────────────────────

interface ContentPageSkeletonProps {
  cards?: number
  animated?: boolean
  className?: string
}

function ContentPageSkeleton({
  cards = 3,
  animated = true,
  className = '',
}: ContentPageSkeletonProps) {
  const pulse = animated ? 'animate-pulse' : ''
  const block = `bg-gray-200 rounded ${pulse}`

  return (
    <div className={`space-y-5 ${className}`}>
      <div className="space-y-1">
        <div className={`h-6 w-40 ${block}`} />
        <div className={`h-3 w-56 ${block}`} />
      </div>
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} showIcon lines={2} showFooter animated={animated} />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// translated（translated PSkeleton.Card、PSkeleton.AppCardGrid translated）
// ─────────────────────────────────────────────

const PSkeleton = Object.assign(PSkeletonBase, {
  Card: CardSkeleton,
  AppCardGrid: AppCardGridSkeleton,
  DetailPage: DetailPageSkeleton,
  Table: TableSkeleton,
  List: ListSkeleton,
  PageLoader: PageLoader,
  Dashboard: DashboardPageSkeleton,
  Management: ManagementPageSkeleton,
  Content: ContentPageSkeleton,
})

export default PSkeleton
