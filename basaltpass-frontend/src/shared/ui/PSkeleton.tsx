import React from 'react'

// ─────────────────────────────────────────────
// 基础 PSkeleton
// ─────────────────────────────────────────────

interface PSkeletonProps {
  /** 形状变体 */
  variant?: 'text' | 'circle' | 'rect' | 'button'
  /** 宽度（Tailwind 类或 CSS 值）*/
  width?: string
  /** 高度（Tailwind 类或 CSS 值）*/
  height?: string
  /** 文本变体时渲染的行数 */
  lines?: number
  /** 是否开启脉冲动画 */
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
// 预设：通用卡片骨架屏
// ─────────────────────────────────────────────

interface CardSkeletonProps {
  /** 是否显示顶部图标/头像 */
  showIcon?: boolean
  /** 文本行数 */
  lines?: number
  /** 是否显示底部操作按钮 */
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
// 预设：应用卡片网格骨架屏（3 列）
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
// 预设：详情页骨架屏（带头部 + 多个信息区块）
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
      {/* 顶部返回 + 标题 */}
      <div className="flex items-center space-x-3">
        <div className={`h-8 w-8 rounded ${block}`} />
        <div className={`h-7 w-48 ${block}`} />
        <div className={`h-5 w-16 rounded-full ml-2 ${block}`} />
      </div>

      {/* 主信息卡片 */}
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

      {/* 信息网格：两列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-5 space-y-3">
            <div className={`h-4 w-1/3 ${block}`} />
            <div className={`h-8 w-full rounded ${block}`} />
            <div className={`h-3 w-2/3 ${block}`} />
          </div>
        ))}
      </div>

      {/* 底部操作按钮 */}
      <div className="flex space-x-3">
        <div className={`h-9 w-28 rounded-md ${block}`} />
        <div className={`h-9 w-28 rounded-md ${block}`} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 预设：表格骨架屏
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
      {/* 表头 */}
      <div className="border-b border-gray-100 px-4 py-3 flex space-x-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className={`h-4 flex-1 ${block}`} style={{ maxWidth: i === 0 ? '6rem' : undefined }} />
        ))}
      </div>
      {/* 表行 */}
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
// 预设：列表条目骨架屏
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
// 预设：全屏路由级加载（认证检查时使用）
// ─────────────────────────────────────────────

interface PageLoaderProps {
  message?: string
  animated?: boolean
}

function PageLoader({ message = '加载中...', animated = true }: PageLoaderProps) {
  const pulse = animated ? 'animate-pulse' : ''
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-6 w-80">
        {/* Logo 占位 */}
        <div className={`h-12 w-12 rounded-2xl bg-gray-200 ${pulse}`} />
        {/* 标题占位 */}
        <div className="w-full space-y-3">
          <div className={`h-5 w-2/3 mx-auto rounded bg-gray-200 ${pulse}`} />
          <div className={`h-3 w-1/2 mx-auto rounded bg-gray-200 ${pulse}`} />
        </div>
        {/* 进度条动画 */}
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
// 预设：Dashboard 骨架屏（统计卡片 + 图表区域）
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
      {/* 页面标题 */}
      <div className="space-y-2">
        <div className={`h-7 w-40 ${block}`} />
        <div className={`h-4 w-64 ${block}`} />
      </div>

      {/* 统计卡片行 */}
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

      {/* 图表/内容区域 */}
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
// 预设：通用管理页面骨架屏（带顶部操作栏 + 表格）
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
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className={`h-6 w-36 ${block}`} />
          <div className={`h-3 w-52 ${block}`} />
        </div>
        <div className={`h-9 w-24 rounded-md ${block}`} />
      </div>

      {/* 搜索/过滤栏 */}
      {showSearch && (
        <div className="flex space-x-3">
          <div className={`h-9 flex-1 max-w-xs rounded-md ${block}`} />
          <div className={`h-9 w-24 rounded-md ${block}`} />
        </div>
      )}

      {/* 表格 */}
      <TableSkeleton rows={rows} cols={cols} animated={animated} />
    </div>
  )
}

// ─────────────────────────────────────────────
// 预设：通用内容页骨架屏（带标题 + 卡片列表）
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
// 组合导出（支持 PSkeleton.Card、PSkeleton.AppCardGrid 等）
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
